import express from "express";
import {
  getBookings,
  createBooking,
  updateBooking,
  deleteBooking,
  addCustomization,
  negotiatePrice,
  sendBookingMessage,
  getBookingMessages,
  handlePaymentSuccess,
} from "../controllers/bookingController";
import { hybridAuth } from "../middleware/hybridAuthMiddleware";

const router = express.Router();

router.get("/", hybridAuth(), getBookings);
router.post("/", hybridAuth(), createBooking);
router.put("/:id", hybridAuth(), updateBooking);
router.delete("/:id", hybridAuth(), deleteBooking);

// Customization and negotiation
router.post("/:id/customization", hybridAuth(), addCustomization);
router.post("/:id/negotiate", hybridAuth(), negotiatePrice);

// Messaging
router.get("/:id/messages", hybridAuth(), getBookingMessages);
router.post("/:id/messages", hybridAuth(), sendBookingMessage);

// Payment
router.post("/payment-success", hybridAuth(), handlePaymentSuccess);

export default router;
