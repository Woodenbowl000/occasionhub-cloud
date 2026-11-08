"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { CheckCircle, Loader2 } from "lucide-react";
import Link from "next/link";
import { API_URL } from "@/lib/api";

// useSearchParams needs a Suspense boundary for the page to prerender
export default function CheckoutSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      }
    >
      <CheckoutSuccess />
    </Suspense>
  );
}

function CheckoutSuccess() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading"
  );
  const [bookingDetails, setBookingDetails] = useState<any>(null);

  useEffect(() => {
    const sessionId = searchParams.get("session_id");

    if (!sessionId) {
      setStatus("error");
      return;
    }

    // Update booking payment status in your backend
    const updatePaymentStatus = async () => {
      try {
        const token = localStorage.getItem("token");

        if (!token) {
          console.error("No auth token found");
          setStatus("error");
          return;
        }

        console.log("Sending payment success request:", { sessionId });

        const response = await fetch(
          `${API_URL}/bookings/payment-success`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ sessionId }),
          }
        );

        console.log("Response status:", response.status);

        // Check content type before parsing
        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          const text = await response.text();
          console.error("Received non-JSON response:", text.substring(0, 200));
          throw new Error("Server returned non-JSON response");
        }

        if (!response.ok) {
          const errorData = await response.json();
          console.error("API error:", errorData);
          throw new Error(
            errorData.message || "Failed to update payment status"
          );
        }

        const data = await response.json();
        console.log("Payment success response:", data);
        setBookingDetails(data);
        setStatus("success");
      } catch (error: any) {
        console.error("Error updating payment:", error);
        setStatus("error");
      }
    };

    updatePaymentStatus();
  }, [searchParams]);

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-16 h-16 text-primary animate-spin mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2">
            Processing Payment...
          </h1>
          <p className="text-muted-foreground">
            Please wait while we confirm your payment.
          </p>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-card border border-border rounded-lg p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">❌</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">
            Payment Verification Failed
          </h1>
          <p className="text-muted-foreground mb-6">
            We couldn't verify your payment. Please contact support if you were
            charged.
          </p>
          <div className="flex gap-3 justify-center">
            <Link
              href="/dashboard/bookings"
              className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90"
            >
              View Bookings
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-card border border-border rounded-lg p-8 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-10 h-10 text-green-600" />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">
          Payment Successful!
        </h1>
        <p className="text-muted-foreground mb-6">
          Your booking has been confirmed and payment received.
        </p>

        {bookingDetails && (
          <div className="bg-muted/30 rounded-lg p-4 mb-6 text-left space-y-3">
            <div className="flex justify-between pb-2">
              <span className="text-muted-foreground">Booking ID:</span>
              <span className="font-semibold text-foreground">
                #{bookingDetails.id}
              </span>
            </div>

            <div className="border-t border-border pt-2 space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Amount:</span>
                <span className="font-semibold text-foreground">
                  Rs {bookingDetails.paidAmount?.toLocaleString()}
                </span>
              </div>

              {bookingDetails.platformFee && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    Platform Fee (15%):
                  </span>
                  <span className="text-muted-foreground">
                    Rs {bookingDetails.platformFee?.toLocaleString()}
                  </span>
                </div>
              )}

              {bookingDetails.vendorPayout && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    Vendor Receives (85%):
                  </span>
                  <span className="text-muted-foreground">
                    Rs {bookingDetails.vendorPayout?.toLocaleString()}
                  </span>
                </div>
              )}
            </div>

            <div className="flex justify-between pt-2 border-t border-border">
              <span className="text-muted-foreground">Status:</span>
              <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-sm font-medium">
                Paid ✓
              </span>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3">
          <Link
            href="/dashboard/bookings"
            className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90"
          >
            View My Bookings
          </Link>
          <Link
            href="/venues"
            className="px-6 py-3 bg-muted text-foreground rounded-lg font-semibold hover:bg-muted/80"
          >
            Browse More Venues
          </Link>
        </div>
      </div>
    </div>
  );
}
