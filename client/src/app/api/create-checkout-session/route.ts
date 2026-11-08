import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

export async function POST(request: NextRequest) {
  // Created per request so the app still builds/deploys without Stripe keys
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json(
      { error: "Payments are not configured (missing STRIPE_SECRET_KEY)" },
      { status: 503 }
    );
  }
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2025-11-17.clover",
  });

  try {
    const body = await request.json();
    const { bookingId, amount, venueName, userId, userEmail } = body;

    // Validate required fields
    if (!bookingId || !amount || !venueName || !userId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "pkr", // Pakistani Rupees
            product_data: {
              name: `Booking: ${venueName}`,
              description: `Venue booking payment for ${venueName}`,
            },
            unit_amount: Math.round(amount * 100), // Stripe expects amount in smallest currency unit (paisas)
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${request.nextUrl.origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${request.nextUrl.origin}/checkout/cancel`,
      metadata: {
        bookingId: bookingId.toString(),
        userId: userId.toString(),
      },
      customer_email: userEmail,
    });

    return NextResponse.json({ sessionId: session.id, url: session.url });
  } catch (error: any) {
    console.error("Stripe checkout error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
