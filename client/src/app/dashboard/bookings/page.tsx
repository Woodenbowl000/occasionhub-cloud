"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { Booking } from "@/types";
import CheckoutButton from "@/components/CheckoutButton";
import { useAuth } from "@/app/(auth)/authProvider";

export default function MyBookingsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const response = await api.get("/bookings");
      // Handle both array and object with bookings property
      const data = response.data?.bookings || response.data;
      setBookings(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to fetch bookings");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (bookingId: number) => {
    if (!confirm("Are you sure you want to cancel this booking?")) return;

    try {
      await api.delete(`/bookings/${bookingId}`);
      setBookings(bookings.filter((b) => b.id !== bookingId));
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to cancel booking");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Confirmed":
        return "bg-green-100 text-green-800";
      case "Pending":
        return "bg-yellow-100 text-yellow-800";
      case "Cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "Pending":
        return "Awaiting Vendor Confirmation";
      case "Confirmed":
        return "Confirmed";
      case "Cancelled":
        return "Cancelled";
      case "Completed":
        return "Completed";
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold text-foreground mb-6">My Bookings</h1>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold text-foreground mb-6">My Bookings</h1>
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-foreground">My Bookings</h1>
        <button
          onClick={() => router.push("/venues")}
          className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
        >
          Book a Venue
        </button>
      </div>

      {bookings.length === 0 ? (
        <div className="text-center py-12 bg-card rounded-lg shadow-md border border-border">
          <svg
            className="w-16 h-16 mx-auto text-muted-foreground mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <h2 className="text-xl font-semibold text-foreground mb-2">
            No bookings yet
          </h2>
          <p className="text-muted-foreground mb-6">
            Start exploring venues and make your first booking!
          </p>
          <button
            onClick={() => router.push("/venues")}
            className="px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
          >
            Browse Venues
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {bookings.map((booking) => (
            <div
              key={booking.id}
              className="bg-card rounded-lg shadow-md p-6 border border-border"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    {booking.venue.name}
                  </h3>
                  <p className="text-muted-foreground mb-2">
                    {booking.venue.venueType.replace(/([A-Z])/g, " $1").trim()}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {booking.venue.location.address},{" "}
                    {booking.venue.location.city}
                  </p>
                </div>
                <div className="text-right">
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                      booking.status
                    )}`}
                  >
                    {getStatusText(booking.status)}
                  </span>
                  <div className="mt-3">
                    <p className="text-xs text-muted-foreground">
                      Price Estimation
                    </p>
                    <p className="text-xl font-bold text-primary-600">
                      Rs {booking.totalPrice.toFixed(2)}
                    </p>
                    {booking.status === "Pending" && (
                      <p className="text-xs text-muted-foreground mt-1">
                        *May be adjusted by vendor
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4 pt-4 border-t">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Start</p>
                  <p className="font-medium text-foreground">
                    {new Date(booking.startDateTime).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">End</p>
                  <p className="font-medium text-foreground">
                    {new Date(booking.endDateTime).toLocaleString()}
                  </p>
                </div>
              </div>

              {booking.message && (
                <div className="mb-4 p-3 bg-muted/50 rounded-md">
                  <p className="text-sm text-muted-foreground mb-1">
                    Your Message
                  </p>
                  <p className="text-foreground">{booking.message}</p>
                </div>
              )}

              {/* Payment Section - Show for Confirmed but unpaid bookings */}
              {booking.status === "Confirmed" &&
                booking.paymentStatus !== "paid" && (
                  <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-md">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-green-800 mb-1">
                          🎉 Booking Confirmed!
                        </p>
                        <p className="text-sm text-green-700">
                          Complete your payment to secure this reservation.
                        </p>
                      </div>
                      {user && (
                        <CheckoutButton
                          bookingId={booking.id}
                          amount={booking.negotiatedPrice || booking.totalPrice}
                          venueName={booking.venue.name}
                          userId={user.id}
                          userEmail={user.email}
                        />
                      )}
                    </div>
                  </div>
                )}

              {/* Payment Status Badge - Show for paid bookings */}
              {booking.paymentStatus === "paid" && (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md flex items-center gap-2">
                  <span className="text-2xl">✅</span>
                  <div>
                    <p className="text-sm font-medium text-blue-800">
                      Payment Completed
                    </p>
                    <p className="text-xs text-blue-700">
                      Amount Paid: Rs {booking.paidAmount?.toLocaleString()}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex justify-between items-center pt-4 border-t">
                <button
                  onClick={() => router.push(`/venues/${booking.venue.id}`)}
                  className="text-primary-600 hover:text-primary-700 font-medium"
                >
                  View Venue
                </button>
                {booking.status !== "Cancelled" &&
                  booking.status !== "Completed" && (
                    <button
                      onClick={() => handleCancel(booking.id)}
                      className="px-4 py-2 text-red-600 border border-red-300 rounded-md hover:bg-red-50"
                    >
                      Cancel Booking
                    </button>
                  )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
