import { Request, Response } from "express";
import { Prisma, VenueType } from "@prisma/client";
import prisma from "../lib/prisma";
import { saveVenuePhotos, requestBaseUrl } from "../utils/storage";


// Helper function to calculate distance between two points (Haversine formula)
const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Columns the venue list may be sorted by. Anything else from the query string
// is ignored, so callers cannot sort on arbitrary (or non-existent) fields.
const SORTABLE_FIELDS = new Set([
  "postedDate",
  "pricePerDay",
  "capacity",
  "rating",
  "views",
  "name",
]);
const MAX_PAGE_SIZE = 100;

type Coordinates = { id: number; lat: number; lon: number };

/**
 * Looks up the coordinates of many locations in ONE query.
 * (Previously one query was issued per venue: an N+1 pattern that made a
 * 20-venue page cost 21 database round trips.)
 */
const getCoordinates = async (
  locationIds: number[]
): Promise<Map<number, Coordinates>> => {
  if (locationIds.length === 0) return new Map();
  const rows = await prisma.$queryRaw<Coordinates[]>`
    SELECT id,
           ST_Y(coordinates::geometry) AS lat,
           ST_X(coordinates::geometry) AS lon
    FROM "Location"
    WHERE id IN (${Prisma.join(locationIds)})
  `;
  return new Map(rows.map((r) => [r.id, r]));
};

export const getVenues = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      venueType,
      minPrice,
      maxPrice,
      minCapacity,
      maxCapacity,
      city,
      sortBy = "postedDate",
      sortOrder = "desc",
      page = "1",
      limit = "20",
      userLat,
      userLon,
    } = req.query;

    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const take = Math.min(
      MAX_PAGE_SIZE,
      Math.max(1, parseInt(limit as string) || 20)
    );
    const skip = (pageNum - 1) * take;
    const order: Prisma.SortOrder = sortOrder === "asc" ? "asc" : "desc";
    const sortField = SORTABLE_FIELDS.has(sortBy as string)
      ? (sortBy as string)
      : "postedDate";

    // Build where clause
    const where: Prisma.VenueWhereInput = {
      isAvailable: true,
      isApproved: true, // Only show approved venues
    };

    if (venueType) where.venueType = venueType as VenueType;
    if (minPrice || maxPrice) {
      where.pricePerDay = {
        ...(minPrice ? { gte: parseFloat(minPrice as string) } : {}),
        ...(maxPrice ? { lte: parseFloat(maxPrice as string) } : {}),
      };
    }
    if (minCapacity || maxCapacity) {
      where.capacity = {
        ...(minCapacity ? { gte: parseInt(minCapacity as string) } : {}),
        ...(maxCapacity ? { lte: parseInt(maxCapacity as string) } : {}),
      };
    }
    if (city) {
      // Served by the pg_trgm GIN index on Location.city
      where.location = {
        city: { contains: city as string, mode: "insensitive" },
      };
    }

    // The page and the total count are independent: run them in parallel.
    const [venues, total] = await Promise.all([
      prisma.venue.findMany({
        where,
        include: {
          location: true,
          vendor: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        skip,
        take,
        orderBy: sortBy === "distance" ? undefined : { [sortField]: order },
      }),
      prisma.venue.count({ where }),
    ]);

    let coords = new Map<number, Coordinates>();
    try {
      coords = await getCoordinates([
        ...new Set(venues.map((v) => v.locationId)),
      ]);
    } catch (error) {
      console.error("Error extracting coordinates:", error);
    }

    const hasUserLocation = Boolean(userLat && userLon);
    const userLatNum = parseFloat(userLat as string);
    const userLonNum = parseFloat(userLon as string);

    const result: any[] = venues.map((venue) => {
      const c = coords.get(venue.locationId);
      if (!c) return venue;
      const withCoords = { ...venue, latitude: c.lat, longitude: c.lon };
      if (!hasUserLocation) return withCoords;
      const distance = calculateDistance(userLatNum, userLonNum, c.lat, c.lon);
      return { ...withCoords, distance: parseFloat(distance.toFixed(2)) };
    });

    // Sort by distance if requested
    if (sortBy === "distance" && hasUserLocation) {
      result.sort((a, b) => {
        const distA = a.distance ?? Infinity;
        const distB = b.distance ?? Infinity;
        return order === "asc" ? distA - distB : distB - distA;
      });
    }

    res.status(200).json({
      venues: result,
      pagination: {
        page: pageNum,
        limit: take,
        total,
        totalPages: Math.ceil(total / take),
      },
    });
  } catch (error) {
    console.error("Get venues error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getVenueById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    const venue = await prisma.venue.findUnique({
      where: { id: parseInt(id) },
      include: {
        location: true,
        vendor: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        bookings: {
          where: {
            status: { in: ["Confirmed", "Pending"] },
          },
          select: {
            id: true,
            startDateTime: true,
            endDateTime: true,
            status: true,
          },
        },
      },
    });

    if (!venue) {
      res.status(404).json({ message: "Venue not found" });
      return;
    }

    // Track view in VenueView table
    const userId = req.user?.id || null;
    const ipAddress = req.ip || req.socket.remoteAddress || null;

    await prisma.$transaction([
      // Increment cumulative view count
      prisma.venue.update({
        where: { id: parseInt(id) },
        data: { views: { increment: 1 } },
      }),
      // Record individual view with timestamp
      prisma.venueView.create({
        data: {
          venueId: parseInt(id),
          userId: userId,
          ipAddress: ipAddress,
        },
      }),
    ]);

    // Extract coordinates from PostGIS
    try {
      const result = await prisma.$queryRaw<{ lat: number; lon: number }[]>`
        SELECT ST_Y(coordinates::geometry) as lat,
               ST_X(coordinates::geometry) as lon
        FROM "Location"
        WHERE id = ${venue.locationId}
      `;

      if (result.length > 0) {
        const { lat, lon } = result[0];
        res.status(200).json({ ...venue, latitude: lat, longitude: lon });
        return;
      }
    } catch (error) {
      console.error("Error extracting coordinates:", error);
    }

    res.status(200).json(venue);
  } catch (error) {
    console.error("Get venue by ID error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const createVenue = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const {
      name,
      description,
      pricePerDay,
      minPrice,
      maxPrice,
      capacity,
      minCapacity,
      maxCapacity,
      amenities,
      venueType,
      location,
    } = req.body;

    const vendorId = req.user?.id;
    if (!vendorId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    // Handle uploaded images
    const files = req.files as Express.Multer.File[];
    const photoUrls = await saveVenuePhotos(files, requestBaseUrl(req));

    // Parse amenities if it's a string
    const parsedAmenities =
      typeof amenities === "string" ? JSON.parse(amenities) : amenities;

    // Parse location if it's a string
    const parsedLocation =
      typeof location === "string" ? JSON.parse(location) : location;

    // Create location using raw SQL (PostGIS geometry not supported by Prisma Client)
    const locationResult = await prisma.$queryRaw<{ id: number }[]>`
      INSERT INTO "Location" (address, city, state, country, "postalCode", coordinates)
      VALUES (
        ${parsedLocation.address},
        ${parsedLocation.city},
        ${parsedLocation.state},
        ${parsedLocation.country},
        ${parsedLocation.postalCode},
        ST_GeogFromText(${`POINT(${parsedLocation.longitude} ${parsedLocation.latitude})`})
      )
      RETURNING id
    `;
    const createdLocation = locationResult[0];

    // Create venue - auto-approve for admins, require approval for vendors
    const isAdmin = req.user?.role === "ADMIN";
    const venue = await prisma.venue.create({
      data: {
        name,
        description,
        pricePerDay: parseFloat(pricePerDay),
        minPrice: minPrice ? parseFloat(minPrice) : null,
        maxPrice: maxPrice ? parseFloat(maxPrice) : null,
        minCapacity: minCapacity ? parseInt(minCapacity) : null,
        maxCapacity: maxCapacity ? parseInt(maxCapacity) : null,
        capacity: parseInt(capacity),
        photoUrls,
        amenities: parsedAmenities,
        venueType,
        locationId: createdLocation.id,
        vendorId,
        isApproved: isAdmin, // Admins' venues are auto-approved
      },
      include: {
        location: true,
      },
    });

    res.status(201).json(venue);
  } catch (error) {
    console.error("Create venue error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const updateVenue = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const vendorId = req.user?.id;

    // Check if venue exists and user owns it or is admin
    const venue = await prisma.venue.findUnique({
      where: { id: parseInt(id) },
    });

    if (!venue) {
      res.status(404).json({ message: "Venue not found" });
      return;
    }

    if (venue.vendorId !== vendorId && req.user?.role !== "ADMIN") {
      res.status(403).json({ message: "Access denied" });
      return;
    }

    const updatedVenue = await prisma.venue.update({
      where: { id: parseInt(id) },
      data: updates,
      include: {
        location: true,
      },
    });

    res.status(200).json(updatedVenue);
  } catch (error) {
    console.error("Update venue error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const deleteVenue = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const vendorId = req.user?.id;

    // Check if venue exists and user owns it or is admin
    const venue = await prisma.venue.findUnique({
      where: { id: parseInt(id) },
    });

    if (!venue) {
      res.status(404).json({ message: "Venue not found" });
      return;
    }

    if (venue.vendorId !== vendorId && req.user?.role !== "ADMIN") {
      res.status(403).json({ message: "Access denied" });
      return;
    }

    await prisma.venue.delete({
      where: { id: parseInt(id) },
    });

    res.status(200).json({ message: "Venue deleted successfully" });
  } catch (error) {
    console.error("Delete venue error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getVenueBookedDates = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;

    // Get only confirmed bookings for the venue (pending bookings should not block dates)
    const bookings = await prisma.booking.findMany({
      where: {
        venueId: parseInt(id),
        status: "Confirmed",
        startDateTime: {
          gte: new Date(), // Only future bookings
        },
      },
      select: {
        startDateTime: true,
        endDateTime: true,
        status: true,
      },
      orderBy: {
        startDateTime: "asc",
      },
    });

    // Extract all booked dates (day by day)
    const bookedDates: string[] = [];
    bookings.forEach((booking) => {
      const start = new Date(booking.startDateTime);
      const end = new Date(booking.endDateTime);

      // Normalize to start of day
      const currentDate = new Date(
        start.getFullYear(),
        start.getMonth(),
        start.getDate()
      );
      const endDate = new Date(
        end.getFullYear(),
        end.getMonth(),
        end.getDate()
      );

      // Add all dates in the booking range
      while (currentDate <= endDate) {
        const dateStr = currentDate.toISOString().split("T")[0];
        if (!bookedDates.includes(dateStr)) {
          bookedDates.push(dateStr);
        }
        currentDate.setDate(currentDate.getDate() + 1);
      }
    });

    res.status(200).json({ bookedDates });
  } catch (error) {
    console.error("Get venue booked dates error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
