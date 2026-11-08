import { Router } from "express";
import {
  getVendorStats,
  getVendorVenues,
  getVendorBookings,
  updateBookingStatus,
  deleteVendorVenue,
  updateVendorVenue,
} from "../controllers/vendorController";
import { hybridAuth } from "../middleware/hybridAuthMiddleware";
import { Request, Response, NextFunction } from "express";

const router = Router();

// Middleware to check if user is a vendor (isVendor = true)
const checkIsVendor = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user?.isVendor) {
    return res.status(403).json({
      message: "Access Denied - Vendor access required",
    });
  }
  next();
};

// All vendor routes require authentication and isVendor flag
router.use(hybridAuth());
router.use(checkIsVendor);

// Dashboard stats
router.get("/stats", getVendorStats);

// Venue management
router.get("/venues", getVendorVenues);
router.put("/venues/:id", updateVendorVenue);
router.delete("/venues/:id", deleteVendorVenue);

// Booking management
router.get("/bookings", getVendorBookings);
router.patch("/bookings/:id", updateBookingStatus);

export default router;
