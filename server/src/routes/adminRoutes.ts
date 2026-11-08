import { Router } from "express";
import {
  getDashboardStats,
  getMonthlyRevenue,
  getRevenueByVenue,
  getAllUsers,
  updateUserRole,
  deleteUser,
  toggleUserStatus,
  getAllVendors,
  deleteVendor,
  toggleVendorStatus,
  toggleVenueStatus,
  searchData,
  getVenueStats,
  getAllBookings,
  getPendingVenues,
  approveVenue,
  rejectVenue,
} from "../controllers/adminController";
import { hybridAuth } from "../middleware/hybridAuthMiddleware";

const router = Router();

// All routes require authentication and admin role
router.use(hybridAuth(["admin"]));

// Dashboard
router.get("/stats", getDashboardStats);
router.get("/revenue/monthly", getMonthlyRevenue);
router.get("/revenue/by-venue", getRevenueByVenue);
router.get("/venue-stats", getVenueStats);
router.get("/search", searchData);

// Bookings
router.get("/bookings", getAllBookings);

// User Management
router.get("/users", getAllUsers);
router.patch("/users/:userId/role", updateUserRole);
router.delete("/users/:userId", deleteUser);
router.patch("/users/:userId/toggle-active", toggleUserStatus);

// Vendor Management
router.get("/vendors", getAllVendors);
router.delete("/vendors/:vendorId", deleteVendor);
router.patch("/vendors/:vendorId/toggle-status", toggleVendorStatus);
router.patch("/venues/:venueId/toggle-status", toggleVenueStatus);

// Venue Approval
router.get("/venues/pending", getPendingVenues);
router.post("/venues/:venueId/approve", approveVenue);
router.delete("/venues/:venueId/reject", rejectVenue);

export default router;
