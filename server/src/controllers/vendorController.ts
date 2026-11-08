import { Request, Response } from "express";
import prisma from "../lib/prisma";


// Get vendor dashboard statistics
export const getVendorStats = async (req: Request, res: Response) => {
  try {
    const vendorId = req.user?.id;
    const { venueId } = req.query;

    // Build venue filter
    const venueFilter: any = { vendorId };
    if (venueId && venueId !== "all") {
      venueFilter.id = parseInt(venueId as string);
    }

    // Get all venues for this vendor (or specific venue)
    const venues = await prisma.venue.findMany({
      where: venueFilter,
      include: {
        bookings: {
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });

    // Calculate stats
    const totalVenues = venues.length;
    const allBookings = venues.flatMap((v) => v.bookings);
    const totalBookings = allBookings.length;
    const pendingBookings = allBookings.filter(
      (b) => b.status === "Pending"
    ).length;
    const confirmedBookings = allBookings.filter(
      (b) => b.status === "Confirmed"
    ).length;

    // Calculate total revenue (vendor gets 85% after 15% admin commission)
    const totalRevenue = allBookings
      .filter((b) => b.status === "Confirmed" || b.status === "Completed")
      .reduce((sum, b) => sum + b.totalPrice * 0.85, 0);

    // Calculate total views across all venues
    const totalViews = venues.reduce((sum, v) => sum + v.views, 0);

    // Calculate REAL view trends from VenueView table (last 30 days)
    const venueIds = venues.map((v) => v.id);
    const thirtyDaysAgoForViews = new Date();
    thirtyDaysAgoForViews.setDate(thirtyDaysAgoForViews.getDate() - 30);

    const viewRecords = await prisma.venueView.findMany({
      where: {
        venueId: { in: venueIds },
        viewedAt: { gte: thirtyDaysAgoForViews },
      },
      select: {
        viewedAt: true,
      },
    });

    // Group views by date
    const viewTrendsByDate: { [key: string]: number } = {};
    viewRecords.forEach((view) => {
      const date = view.viewedAt.toISOString().split("T")[0];
      viewTrendsByDate[date] = (viewTrendsByDate[date] || 0) + 1;
    });

    // Calculate booking trends (last 30 days grouped by day)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const bookingTrends = await prisma.booking.findMany({
      where: {
        venue: venueFilter,
        createdAt: {
          gte: thirtyDaysAgo,
        },
      },
      select: {
        createdAt: true,
        totalPrice: true,
        status: true,
      },
    });

    // Group bookings by date
    const trendsByDate: {
      [key: string]: { bookings: number; revenue: number };
    } = {};
    bookingTrends.forEach((booking) => {
      const date = booking.createdAt.toISOString().split("T")[0];
      if (!trendsByDate[date]) {
        trendsByDate[date] = { bookings: 0, revenue: 0 };
      }
      trendsByDate[date].bookings += 1;
      if (booking.status === "Confirmed" || booking.status === "Completed") {
        trendsByDate[date].revenue += booking.totalPrice * 0.85;
      }
    });

    const chartData = Object.entries(trendsByDate).map(([date, data]) => ({
      date,
      bookings: data.bookings,
      revenue: Math.round(data.revenue),
    }));

    const viewsChartData = Object.entries(viewTrendsByDate).map(
      ([date, views]) => ({
        date,
        views,
      })
    );

    // Get recent bookings (last 5)
    const recentBookings = await prisma.booking.findMany({
      where: {
        venue: venueFilter,
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
        venue: {
          select: {
            name: true,
            location: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 5,
    });

    // Get all venues list for dropdown
    const allVenuesList = await prisma.venue.findMany({
      where: { vendorId },
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    res.json({
      totalVenues,
      totalBookings,
      totalRevenue: Math.round(totalRevenue),
      totalViews,
      pendingBookings,
      confirmedBookings,
      recentBookings,
      chartData,
      viewsChartData,
      venues: allVenuesList,
    });
  } catch (error) {
    console.error("Error fetching vendor stats:", error);
    res.status(500).json({ error: "Failed to fetch vendor statistics" });
  }
};

// Get all venues for the vendor
export const getVendorVenues = async (req: Request, res: Response) => {
  try {
    const vendorId = req.user?.id;

    const venues = await prisma.venue.findMany({
      where: { vendorId },
      include: {
        location: true,
        _count: {
          select: {
            bookings: true,
          },
        },
      },
      orderBy: {
        id: "desc",
      },
    });

    // Transform response to match frontend expectations
    const transformedVenues = venues.map((venue) => ({
      id: venue.id,
      name: venue.name,
      description: venue.description,
      capacity: venue.capacity,
      minCapacity: venue.minCapacity,
      maxCapacity: venue.maxCapacity,
      price: venue.pricePerDay,
      minPrice: venue.minPrice,
      maxPrice: venue.maxPrice,
      images: venue.photoUrls,
      amenities: venue.amenities,
      location: venue.location,
      _count: venue._count,
    }));

    res.json(transformedVenues);
  } catch (error) {
    console.error("Error fetching vendor venues:", error);
    res.status(500).json({ error: "Failed to fetch venues" });
  }
};

// Get all bookings for vendor's venues
export const getVendorBookings = async (req: Request, res: Response) => {
  try {
    const vendorId = req.user?.id;

    const bookings = await prisma.booking.findMany({
      where: {
        venue: {
          vendorId,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        venue: {
          select: {
            name: true,
            location: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.json(bookings);
  } catch (error) {
    console.error("Error fetching vendor bookings:", error);
    res.status(500).json({ error: "Failed to fetch bookings" });
  }
};

// Update booking status
export const updateBookingStatus = async (req: Request, res: Response) => {
  try {
    const vendorId = req.user?.id;
    const bookingId = parseInt(req.params.id);
    const { status } = req.body;

    // Verify the booking belongs to vendor's venue
    const booking = await prisma.booking.findFirst({
      where: {
        id: bookingId,
        venue: {
          vendorId,
        },
      },
    });

    if (!booking) {
      return res
        .status(404)
        .json({ error: "Booking not found or unauthorized" });
    }

    // Update booking status
    const updatedBooking = await prisma.booking.update({
      where: { id: bookingId },
      data: { status },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
        venue: {
          select: {
            name: true,
            location: true,
          },
        },
      },
    });

    res.json(updatedBooking);
  } catch (error) {
    console.error("Error updating booking status:", error);
    res.status(500).json({ error: "Failed to update booking status" });
  }
};

// Update venue
export const updateVendorVenue = async (req: Request, res: Response) => {
  try {
    const vendorId = req.user?.id;
    const venueId = parseInt(req.params.id);
    const {
      name,
      description,
      venueType,
      capacity,
      minCapacity,
      maxCapacity,
      pricePerDay,
      minPrice,
      maxPrice,
      amenities,
      address,
      city,
      state,
      country,
      postalCode,
      latitude,
      longitude,
      photoUrls,
    } = req.body;

    // Verify venue belongs to vendor
    const existingVenue = await prisma.venue.findFirst({
      where: {
        id: venueId,
        vendorId,
      },
      include: {
        location: true,
      },
    });

    if (!existingVenue) {
      return res.status(404).json({ error: "Venue not found or unauthorized" });
    }

    // Update location with coordinates using raw query
    await prisma.$executeRaw`
      UPDATE "Location"
      SET 
        address = ${address},
        city = ${city},
        state = ${state},
        country = ${country},
        "postalCode" = ${postalCode},
        coordinates = ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography
      WHERE id = ${existingVenue.locationId}
    `;

    // Update venue
    const updatedVenue = await prisma.venue.update({
      where: { id: venueId },
      data: {
        name,
        description,
        venueType,
        capacity,
        minCapacity,
        maxCapacity,
        pricePerDay,
        minPrice,
        maxPrice,
        amenities,
        photoUrls,
        isApproved: false, // Reset approval status on edit
      },
      include: {
        location: true,
      },
    });

    res.json(updatedVenue);
  } catch (error) {
    console.error("Error updating venue:", error);
    res.status(500).json({ error: "Failed to update venue" });
  }
};

// Delete venue (only if no bookings)
export const deleteVendorVenue = async (req: Request, res: Response) => {
  try {
    const vendorId = req.user?.id;
    const venueId = parseInt(req.params.id);

    // Verify venue belongs to vendor
    const venue = await prisma.venue.findFirst({
      where: {
        id: venueId,
        vendorId,
      },
      include: {
        _count: {
          select: {
            bookings: true,
          },
        },
      },
    });

    if (!venue) {
      return res.status(404).json({ error: "Venue not found or unauthorized" });
    }

    // Check if venue has bookings
    if (venue._count.bookings > 0) {
      return res.status(400).json({
        error: "Cannot delete venue with existing bookings",
      });
    }

    // Delete venue
    await prisma.venue.delete({
      where: { id: venueId },
    });

    res.json({ message: "Venue deleted successfully" });
  } catch (error) {
    console.error("Error deleting venue:", error);
    res.status(500).json({ error: "Failed to delete venue" });
  }
};
