import express from "express";
import {
  getVenues,
  getVenueById,
  createVenue,
  updateVenue,
  deleteVenue,
  getVenueBookedDates,
} from "../controllers/venueController";
import { hybridAuth } from "../middleware/hybridAuthMiddleware";
import { upload } from "../middleware/uploadMiddleware";

const router = express.Router();

router.get("/", getVenues);
router.get("/:id", getVenueById);
router.get("/:id/booked-dates", getVenueBookedDates);
router.post("/", hybridAuth(), upload.array("photos", 10), createVenue);
router.put("/:id", hybridAuth(), upload.array("photos", 10), updateVenue);
router.delete("/:id", hybridAuth(), deleteVenue);

export default router;
