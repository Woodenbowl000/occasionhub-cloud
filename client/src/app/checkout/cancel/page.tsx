"use client";

import { XCircle } from "lucide-react";
import Link from "next/link";

export default function CheckoutCancel() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-card border border-border rounded-lg p-8 text-center">
        <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <XCircle className="w-10 h-10 text-orange-600" />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">
          Payment Cancelled
        </h1>
        <p className="text-muted-foreground mb-6">
          Your payment was cancelled. No charges were made to your account.
        </p>

        <div className="bg-muted/30 rounded-lg p-4 mb-6">
          <p className="text-sm text-muted-foreground">
            Your booking is still reserved. You can complete the payment anytime
            from your bookings page.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <Link
            href="/dashboard/bookings"
            className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90"
          >
            Back to My Bookings
          </Link>
          <Link
            href="/venues"
            className="px-6 py-3 bg-muted text-foreground rounded-lg font-semibold hover:bg-muted/80"
          >
            Continue Browsing
          </Link>
        </div>
      </div>
    </div>
  );
}
