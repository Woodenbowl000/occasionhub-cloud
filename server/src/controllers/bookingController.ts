import { Request, Response } from "express";
import prisma from "../lib/prisma";


export const getBookings = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { status, page = "1", limit = "20" } = req.query;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const where: any = {
      userId,
    };

    if (status) {
      where.status = status;
    }

    const bookings = await prisma.booking.findMany({
      where,
      include: {
        venue: {
          include: {
            location: true,
          },
        },
      },
      skip,
      take: parseInt(limit as string),
      orderBy: { createdAt: "desc" },
    });

    const total = await prisma.booking.count({ where });

    res.status(200).json({
      bookings,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        totalPages: Math.ceil(total / parseInt(limit as string)),
      },
    });
  } catch (error) {
    console.error("Get bookings error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const createBooking = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const {
      venueId,
      startDateTime,
      endDateTime,
      message,
      customization,
      negotiatedPrice,
    } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    // Check venue availability
    const venue = await prisma.venue.findUnique({
      where: { id: venueId },
    });

    if (!venue || !venue.isAvailable) {
      res.status(400).json({ message: "Venue not available" });
      return;
    }

    // Normalize dates to check for day conflicts
    const startDate = new Date(startDateTime);
    const endDate = new Date(endDateTime);

    // Check for conflicting CONFIRMED bookings only (allow multiple pending requests)
    const conflictingBooking = await prisma.booking.findFirst({
      where: {
        venueId,
        status: "Confirmed", // Only check confirmed bookings
        OR: [
          {
            // New booking starts during existing booking
            AND: [
              { startDateTime: { lte: startDate } },
              { endDateTime: { gt: startDate } },
            ],
          },
          {
            // New booking ends during existing booking
            AND: [
              { startDateTime: { lt: endDate } },
              { endDateTime: { gte: endDate } },
            ],
          },
          {
            // New booking completely contains existing booking
            AND: [
              { startDateTime: { gte: startDate } },
              { endDateTime: { lte: endDate } },
            ],
          },
        ],
      },
    });

    if (conflictingBooking) {
      res.status(400).json({
        message:
          "This venue is already confirmed for the selected date(s). Please choose another date.",
      });
      return;
    }

    // Calculate total price
    // For day-based bookings, calculate based on full days
    const start = new Date(startDateTime);
    const end = new Date(endDateTime);
    const hours = Math.ceil(
      (end.getTime() - start.getTime()) / (1000 * 60 * 60)
    );
    const days = Math.ceil(hours / 24);

    // Price calculation: If it's a full day booking (24 hours), charge for the day
    const totalPrice = days * venue.pricePerDay;

    // Create booking
    const bookingData: any = {
      venueId,
      userId,
      startDateTime: new Date(startDateTime),
      endDateTime: new Date(endDateTime),
      totalPrice,
      message,
      customization: customization || null,
    };

    // Add negotiatedPrice if user offered a price
    if (negotiatedPrice && parseFloat(negotiatedPrice) > 0) {
      bookingData.negotiatedPrice = parseFloat(negotiatedPrice);
    }

    const booking = await prisma.booking.create({
      data: bookingData,
      include: {
        venue: {
          include: {
            location: true,
          },
        },
      },
    });

    res.status(201).json(booking);
  } catch (error) {
    console.error("Create booking error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const updateBooking = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const userId = req.user?.id;

    // Check if booking exists and belongs to user
    const booking = await prisma.booking.findUnique({
      where: { id: parseInt(id) },
      include: { venue: true },
    });

    if (!booking) {
      res.status(404).json({ message: "Booking not found" });
      return;
    }

    // Users can only update their own bookings
    // Vendors can update bookings for their venues
    // Admins can update any booking
    const isOwner = booking.userId === userId;
    const isVendor = booking.venue.vendorId === userId;
    const isAdmin = req.user?.role === "ADMIN";

    if (!isOwner && !isVendor && !isAdmin) {
      res.status(403).json({ message: "Access denied" });
      return;
    }

    // If confirming a booking, cancel other pending bookings for the same date/venue
    if (status === "Confirmed" && booking.status !== "Confirmed") {
      const startDate = new Date(booking.startDateTime);
      const endDate = new Date(booking.endDateTime);

      // Find and cancel conflicting pending bookings
      await prisma.booking.updateMany({
        where: {
          venueId: booking.venueId,
          id: { not: parseInt(id) }, // Exclude current booking
          status: "Pending",
          OR: [
            {
              // Overlapping bookings
              AND: [
                { startDateTime: { lte: startDate } },
                { endDateTime: { gt: startDate } },
              ],
            },
            {
              AND: [
                { startDateTime: { lt: endDate } },
                { endDateTime: { gte: endDate } },
              ],
            },
            {
              AND: [
                { startDateTime: { gte: startDate } },
                { endDateTime: { lte: endDate } },
              ],
            },
          ],
        },
        data: { status: "Cancelled" },
      });
    }

    const updatedBooking = await prisma.booking.update({
      where: { id: parseInt(id) },
      data: { status },
      include: {
        venue: {
          include: {
            location: true,
          },
        },
      },
    });

    res.status(200).json(updatedBooking);
  } catch (error) {
    console.error("Update booking error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const deleteBooking = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    // Check if booking exists and belongs to user
    const booking = await prisma.booking.findUnique({
      where: { id: parseInt(id) },
    });

    if (!booking) {
      res.status(404).json({ message: "Booking not found" });
      return;
    }

    if (booking.userId !== userId && req.user?.role !== "ADMIN") {
      res.status(403).json({ message: "Access denied" });
      return;
    }

    await prisma.booking.delete({
      where: { id: parseInt(id) },
    });

    res.status(200).json({ message: "Booking cancelled successfully" });
  } catch (error) {
    console.error("Delete booking error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Add customization to booking
export const addCustomization = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { customization } = req.body;
    const userId = req.user?.id;

    const booking = await prisma.booking.findUnique({
      where: { id: parseInt(id) },
    });

    if (!booking) {
      res.status(404).json({ message: "Booking not found" });
      return;
    }

    if (booking.userId !== userId) {
      res.status(403).json({ message: "Access denied" });
      return;
    }

    const updatedBooking = await prisma.booking.update({
      where: { id: parseInt(id) },
      data: { customization },
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
    });

    res.status(200).json(updatedBooking);
  } catch (error) {
    console.error("Add customization error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Negotiate price (vendor or customer can negotiate)
export const negotiatePrice = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { negotiatedPrice } = req.body;
    const userId = req.user?.id;

    const booking = await prisma.booking.findUnique({
      where: { id: parseInt(id) },
      include: {
        venue: true,
      },
    });

    if (!booking) {
      res.status(404).json({ message: "Booking not found" });
      return;
    }

    // Check if user is involved in this booking (customer or vendor)
    const isCustomer = booking.userId === userId;
    const isVendor = booking.venue.vendorId === userId;
    const isAdmin = req.user?.role === "ADMIN";

    if (!isCustomer && !isVendor && !isAdmin) {
      res
        .status(403)
        .json({ message: "Access denied - not part of this booking" });
      return;
    }

    const updatedBooking = await prisma.booking.update({
      where: { id: parseInt(id) },
      data: { negotiatedPrice: parseFloat(negotiatedPrice) },
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
    });

    res.status(200).json(updatedBooking);
  } catch (error) {
    console.error("Negotiate price error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Send message on booking
export const sendBookingMessage = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { message } = req.body;
    const senderId = req.user?.id;

    if (!senderId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const booking = await prisma.booking.findUnique({
      where: { id: parseInt(id) },
      include: {
        venue: true,
      },
    });

    if (!booking) {
      res.status(404).json({ message: "Booking not found" });
      return;
    }

    // Check if user is involved in this booking
    const isCustomer = booking.userId === senderId;
    const isVendor = booking.venue.vendorId === senderId;
    const isAdmin = req.user?.role === "ADMIN";

    if (!isCustomer && !isVendor && !isAdmin) {
      res.status(403).json({ message: "Access denied" });
      return;
    }

    const bookingMessage = await prisma.bookingMessage.create({
      data: {
        bookingId: parseInt(id),
        senderId,
        message,
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    res.status(201).json(bookingMessage);
  } catch (error) {
    console.error("Send message error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get booking messages
export const getBookingMessages = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const booking = await prisma.booking.findUnique({
      where: { id: parseInt(id) },
      include: {
        venue: true,
      },
    });

    if (!booking) {
      res.status(404).json({ message: "Booking not found" });
      return;
    }

    // Check if user is involved in this booking
    const isCustomer = booking.userId === userId;
    const isVendor = booking.venue.vendorId === userId;
    const isAdmin = req.user?.role === "ADMIN";

    if (!isCustomer && !isVendor && !isAdmin) {
      res.status(403).json({ message: "Access denied" });
      return;
    }

    const messages = await prisma.bookingMessage.findMany({
      where: { bookingId: parseInt(id) },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    // Mark messages as read
    await prisma.bookingMessage.updateMany({
      where: {
        bookingId: parseInt(id),
        senderId: { not: userId },
        isRead: false,
      },
      data: { isRead: true },
    });

    res.status(200).json(messages);
  } catch (error) {
    console.error("Get messages error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Handle successful payment from Stripe
export const handlePaymentSuccess = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { sessionId } = req.body;
    const userId = req.user?.id;

    if (!sessionId) {
      res.status(400).json({ message: "Session ID is required" });
      return;
    }

    // Initialize Stripe
    const Stripe = require("stripe");
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    // Retrieve the checkout session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== "paid") {
      res.status(400).json({ message: "Payment not completed" });
      return;
    }

    const bookingId = parseInt(session.metadata.bookingId);
    const paidAmount = session.amount_total / 100; // Convert from smallest currency unit

    // Calculate platform fee (15%) and vendor payout (85%)
    const platformFeePercentage = 0.15; // 15%
    const platformFee = paidAmount * platformFeePercentage;
    const vendorPayout = paidAmount - platformFee;

    // Update booking with payment info
    const booking = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        paymentStatus: "paid",
        stripeSessionId: sessionId,
        paidAmount: paidAmount,
        platformFee: platformFee,
        vendorPayout: vendorPayout,
        paidAt: new Date(),
      },
      include: {
        venue: {
          include: {
            vendor: true,
          },
        },
        user: true,
      },
    });

    res.status(200).json(booking);
  } catch (error) {
    console.error("Payment success handler error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
