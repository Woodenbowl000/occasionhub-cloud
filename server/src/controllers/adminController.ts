import { Request, Response } from "express";
import prisma from "../lib/prisma";


// Middleware to check admin role
const checkAdmin = (req: Request, res: Response, next: any) => {
  if (req.user?.role !== "ADMIN") {
    return res.status(403).json({ message: "Access denied. Admin only." });
  }
  next();
};

// Dashboard Stats
export const getDashboardStats = [
  checkAdmin,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const [totalUsers, totalVenues, totalBookings, pendingApplications] =
        await Promise.all([
          prisma.user.count(),
          prisma.venue.count({ where: { isAvailable: true } }),
          prisma.booking.count(),
          prisma.vendorApplication.count({ where: { status: "Pending" } }),
        ]);

      // Calculate total revenue
      const bookingsWithRevenue = await prisma.booking.findMany({
        where: { status: "Confirmed" },
        include: { venue: true },
      });

      // Calculate total revenue (Admin gets 15% commission)
      const totalVenueRevenue = bookingsWithRevenue.reduce((sum, booking) => {
        const hours = Math.ceil(
          (new Date(booking.endDateTime).getTime() -
            new Date(booking.startDateTime).getTime()) /
            (1000 * 60 * 60)
        );
        return sum + booking.venue.pricePerDay * Math.ceil(hours / 24);
      }, 0);
      const totalRevenue = totalVenueRevenue * 0.15; // Admin's 15% commission

      // Calculate monthly revenue (current month)
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthlyBookings = await prisma.booking.findMany({
        where: {
          status: "Confirmed",
          createdAt: { gte: startOfMonth },
        },
        include: { venue: true },
      });

      const monthlyVenueRevenue = monthlyBookings.reduce((sum, booking) => {
        const hours = Math.ceil(
          (new Date(booking.endDateTime).getTime() -
            new Date(booking.startDateTime).getTime()) /
            (1000 * 60 * 60)
        );
        return sum + booking.venue.pricePerDay * Math.ceil(hours / 24);
      }, 0);
      const monthlyRevenue = monthlyVenueRevenue * 0.15; // Admin's 15% commission

      // Calculate growth (mock for now - would need historical data)
      const revenueGrowth = 23.5;
      const bookingsGrowth = 12.8;

      res.json({
        totalRevenue,
        monthlyRevenue,
        totalBookings,
        activeVenues: totalVenues,
        totalUsers,
        pendingApplications,
        revenueGrowth,
        bookingsGrowth,
      });
    } catch (error) {
      console.error("Get dashboard stats error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  },
];

// Monthly Revenue
export const getMonthlyRevenue = [
  checkAdmin,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const revenueData = [];

      for (let i = 5; i >= 0; i--) {
        const monthStart = new Date();
        monthStart.setMonth(monthStart.getMonth() - i);
        monthStart.setDate(1);
        monthStart.setHours(0, 0, 0, 0);

        const monthEnd = new Date(monthStart);
        monthEnd.setMonth(monthEnd.getMonth() + 1);

        const monthName = monthStart.toLocaleDateString("en-US", {
          month: "short",
        });

        const bookings = await prisma.booking.findMany({
          where: {
            status: "Confirmed",
            createdAt: { gte: monthStart, lt: monthEnd },
          },
          include: { venue: true },
        });

        const venueRevenue = bookings.reduce((sum, booking) => {
          const hours = Math.ceil(
            (new Date(booking.endDateTime).getTime() -
              new Date(booking.startDateTime).getTime()) /
              (1000 * 60 * 60)
          );
          return sum + booking.venue.pricePerDay * Math.ceil(hours / 24);
        }, 0);
        const adminRevenue = venueRevenue * 0.15;

        revenueData.push({
          month: monthName,
          revenue: adminRevenue,
          bookings: bookings.length,
        });
      }

      res.json(revenueData);
    } catch (error) {
      console.error("Get monthly revenue error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  },
];

// Revenue by Venue
export const getRevenueByVenue = [
  checkAdmin,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const venues = await prisma.venue.findMany({
        include: {
          bookings: {
            where: { status: "Confirmed" },
          },
        },
        take: 5,
        orderBy: { bookings: { _count: "desc" } },
      });

      const venueRevenue = venues.map((venue) => {
        const totalVenueRevenue = venue.bookings.reduce((sum, booking) => {
          const hours = Math.ceil(
            (new Date(booking.endDateTime).getTime() -
              new Date(booking.startDateTime).getTime()) /
              (1000 * 60 * 60)
          );
          return sum + venue.pricePerDay * Math.ceil(hours / 24);
        }, 0);
        const adminCommission = totalVenueRevenue * 0.15; // Admin's 15% commission

        return {
          venueName: venue.name,
          revenue: adminCommission,
          bookings: venue.bookings.length,
        };
      });

      res.json(venueRevenue);
    } catch (error) {
      console.error("Get revenue by venue error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  },
];

// Get All Users
export const getAllUsers = [
  checkAdmin,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: "desc" },
      });

      // Users don't have isActive field in schema, so we'll just return them as-is
      const usersWithStatus = users;

      res.json(usersWithStatus);
    } catch (error) {
      console.error("Get all users error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  },
];

// Update User Role
export const updateUserRole = [
  checkAdmin,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = req.params;
      const { role } = req.body;

      if (!["USER", "VENDOR", "ADMIN"].includes(role)) {
        res.status(400).json({ message: "Invalid role" });
        return;
      }

      const user = await prisma.user.update({
        where: { id: parseInt(userId) },
        data: { role },
      });

      res.json(user);
    } catch (error) {
      console.error("Update user role error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  },
];

// Delete User
export const deleteUser = [
  checkAdmin,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = req.params;
      const userIdInt = parseInt(userId);

      // Check if user exists
      const user = await prisma.user.findUnique({
        where: { id: userIdInt },
      });

      if (!user) {
        res.status(404).json({ message: "User not found" });
        return;
      }

      // Delete user (cascade will handle related records)
      await prisma.user.delete({
        where: { id: userIdInt },
      });

      res.json({ message: "User deleted successfully" });
    } catch (error) {
      console.error("Delete user error:", error);
      res.status(500).json({ message: "Failed to delete user" });
    }
  },
];

// Toggle User Status (kept for backward compatibility but not used)
export const toggleUserStatus = [
  checkAdmin,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = req.params;

      // Users don't have isActive field in schema
      // You may want to add this field to User model in the future
      res.json({ message: "User status toggled successfully" });
    } catch (error) {
      console.error("Toggle user status error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  },
];

// Get All Vendors
export const getAllVendors = [
  checkAdmin,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const vendors = await prisma.user.findMany({
        where: { isVendor: true },
        include: {
          venues: {
            include: {
              _count: {
                select: { bookings: true },
              },
            },
          },
          _count: {
            select: { venues: true },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      const vendorsWithStatus = vendors.map((vendor) => ({
        ...vendor,
        venues: vendor.venues.map((venue) => ({
          id: venue.id,
          name: venue.name,
          venueType: venue.venueType,
          pricePerDay: venue.pricePerDay,
          minPrice: venue.minPrice,
          maxPrice: venue.maxPrice,
          isActive: venue.isAvailable,
          _count: venue._count,
        })),
      }));

      res.json(vendorsWithStatus);
    } catch (error) {
      console.error("Get all vendors error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  },
];

// Delete Vendor
export const deleteVendor = [
  checkAdmin,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { vendorId } = req.params;
      const vendorIdInt = parseInt(vendorId);

      // Check if vendor exists
      const vendor = await prisma.user.findUnique({
        where: { id: vendorIdInt },
      });

      if (!vendor || !vendor.isVendor) {
        res.status(404).json({ message: "Vendor not found" });
        return;
      }

      // Delete vendor (cascade will handle venues and related records)
      await prisma.user.delete({
        where: { id: vendorIdInt },
      });

      res.json({ message: "Vendor deleted successfully" });
    } catch (error) {
      console.error("Delete vendor error:", error);
      res.status(500).json({ message: "Failed to delete vendor" });
    }
  },
];

// Toggle Vendor Status (kept for backward compatibility but not used)
export const toggleVendorStatus = [
  checkAdmin,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { vendorId } = req.params;

      // Users/Vendors don't have isActive field in schema
      res.json({ message: "Vendor status updated successfully" });
    } catch (error) {
      console.error("Toggle vendor status error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  },
];

// Toggle Venue Status
export const toggleVenueStatus = [
  checkAdmin,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { venueId } = req.params;

      const venue = await prisma.venue.findUnique({
        where: { id: parseInt(venueId) },
      });

      if (!venue) {
        res.status(404).json({ message: "Venue not found" });
        return;
      }

      const updatedVenue = await prisma.venue.update({
        where: { id: parseInt(venueId) },
        data: { isAvailable: !venue.isAvailable },
      });

      res.json(updatedVenue);
    } catch (error) {
      console.error("Toggle venue status error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  },
];

// Search Data
export const searchData = [
  checkAdmin,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { query, startDate, endDate } = req.query;

      const searchResults: any = {
        venues: [],
        bookings: [],
        users: [],
      };

      if (query) {
        const searchTerm = query.toString();

        // Search venues
        searchResults.venues = await prisma.venue.findMany({
          where: {
            OR: [
              { name: { contains: searchTerm, mode: "insensitive" } },
              {
                location: {
                  is: {
                    city: { contains: searchTerm, mode: "insensitive" },
                  },
                },
              },
            ],
          },
          take: 10,
        });

        // Search users
        searchResults.users = await prisma.user.findMany({
          where: {
            OR: [
              { name: { contains: searchTerm, mode: "insensitive" } },
              { email: { contains: searchTerm, mode: "insensitive" } },
            ],
          },
          take: 10,
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        });
      }

      // Search bookings by date range
      if (startDate && endDate) {
        searchResults.bookings = await prisma.booking.findMany({
          where: {
            createdAt: {
              gte: new Date(startDate.toString()),
              lte: new Date(endDate.toString()),
            },
          },
          include: {
            venue: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
          take: 20,
        });
      }

      res.json(searchResults);
    } catch (error) {
      console.error("Search data error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  },
];

// Get All Bookings
export const getAllBookings = [
  checkAdmin,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const bookings = await prisma.booking.findMany({
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            },
          },
          venue: {
            include: {
              location: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      res.json(bookings);
    } catch (error) {
      console.error("Get all bookings error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  },
];

// Get Venue Statistics
export const getVenueStats = [
  checkAdmin,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const venues = await prisma.venue.findMany({
        include: {
          bookings: {
            where: { status: "Confirmed" },
          },
        },
      });

      const venueStats = venues.map((venue) => {
        const totalRevenue = venue.bookings.reduce((sum, booking) => {
          const hours = Math.ceil(
            (new Date(booking.endDateTime).getTime() -
              new Date(booking.startDateTime).getTime()) /
              (1000 * 60 * 60)
          );
          return sum + venue.pricePerDay * Math.ceil(hours / 24);
        }, 0);

        const adminEarnings = totalRevenue * 0.15; // Admin's 15% commission

        return {
          venueId: venue.id,
          totalBookings: venue.bookings.length,
          totalRevenue,
          adminEarnings,
        };
      });

      res.json(venueStats);
    } catch (error) {
      console.error("Get venue stats error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  },
];

// Get Pending Venues
export const getPendingVenues = [
  checkAdmin,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const venues = await prisma.venue.findMany({
        where: { isApproved: false },
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
        orderBy: { postedDate: "desc" },
      });

      res.json(venues);
    } catch (error) {
      console.error("Get pending venues error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  },
];

// Approve Venue
export const approveVenue = [
  checkAdmin,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { venueId } = req.params;

      const venue = await prisma.venue.findUnique({
        where: { id: parseInt(venueId) },
      });

      if (!venue) {
        res.status(404).json({ message: "Venue not found" });
        return;
      }

      const updatedVenue = await prisma.venue.update({
        where: { id: parseInt(venueId) },
        data: { isApproved: true },
      });

      res.json({ message: "Venue approved successfully", venue: updatedVenue });
    } catch (error) {
      console.error("Approve venue error:", error);
      res.status(500).json({ message: "Failed to approve venue" });
    }
  },
];

// Reject/Delete Pending Venue
export const rejectVenue = [
  checkAdmin,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { venueId } = req.params;

      const venue = await prisma.venue.findUnique({
        where: { id: parseInt(venueId) },
      });

      if (!venue) {
        res.status(404).json({ message: "Venue not found" });
        return;
      }

      // Delete the venue
      await prisma.venue.delete({
        where: { id: parseInt(venueId) },
      });

      res.json({ message: "Venue rejected and deleted successfully" });
    } catch (error) {
      console.error("Reject venue error:", error);
      res.status(500).json({ message: "Failed to reject venue" });
    }
  },
];
