import { Router } from "express";
import {
  submitVendorApplication,
  getMyApplication,
  getAllApplications,
  approveApplication,
  rejectApplication,
} from "../controllers/vendorApplicationController";
import { hybridAuth } from "../middleware/hybridAuthMiddleware";

const router = Router();

// User routes
router.post("/apply", hybridAuth(), submitVendorApplication);
router.get("/my-application", hybridAuth(), getMyApplication);

// Admin routes
router.get("/all", hybridAuth(["admin"]), getAllApplications);
router.post("/:id/approve", hybridAuth(["admin"]), approveApplication);
router.post("/:id/reject", hybridAuth(["admin"]), rejectApplication);

export default router;
