"use client";

import { useEffect, useState, Fragment } from "react";
import {
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  MessageSquare,
  Send,
  ChevronDown,
  ChevronUp,
  DollarSign,
} from "lucide-react";
import { API_URL } from "@/lib/api";

interface Booking {
  id: number;
  startDateTime: string;
  endDateTime: string;
  totalPrice: number;
  negotiatedPrice?: number;
  status: string;
  user: {
    id: number;
    name: string;
    email: string;
  };
  venue: {
    name: string;
    location: {
      city: string;
      state: string;
    };
  };
}

interface BookingMessage {
  id: number;
  message: string;
  isRead: boolean;
  createdAt: string;
  sender: {
    id: number;
    name: string;
  };
}

export default function VendorBookings() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const [expandedBooking, setExpandedBooking] = useState<number | null>(null);
  const [messages, setMessages] = useState<{ [key: number]: BookingMessage[] }>(
    {}
  );
  const [newMessage, setNewMessage] = useState("");
  const [negotiatePrice, setNegotiatePrice] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);

  useEffect(() => {
    fetchBookings(true);
    const interval = setInterval(() => fetchBookings(false), 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchBookings = async (isInitialLoad: boolean) => {
    try {
      if (isInitialLoad) setLoading(true);
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_URL}/vendor/bookings`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error("Failed to fetch bookings");

      const data = await response.json();
      setBookings(data);
      setError("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      if (isInitialLoad) setLoading(false);
    }
  };

  const handleStatusUpdate = async (bookingId: number, status: string) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${API_URL}/vendor/bookings/${bookingId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ status }),
        }
      );

      if (!response.ok) throw new Error("Failed to update booking status");

      fetchBookings(false);
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  const toggleMessages = async (bookingId: number) => {
    if (expandedBooking === bookingId) {
      setExpandedBooking(null);
    } else {
      setExpandedBooking(bookingId);
      if (!messages[bookingId]) {
        await fetchMessages(bookingId);
      }
    }
  };

  const fetchMessages = async (bookingId: number) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${API_URL}/bookings/${bookingId}/messages`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) throw new Error("Failed to fetch messages");

      const data = await response.json();
      setMessages((prev) => ({ ...prev, [bookingId]: data }));
    } catch (err: any) {
      console.error("Error fetching messages:", err);
    }
  };

  const handleSendMessage = async (bookingId: number) => {
    if (!newMessage.trim()) return;

    try {
      setSendingMessage(true);
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${API_URL}/bookings/${bookingId}/messages`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ message: newMessage }),
        }
      );

      if (!response.ok) throw new Error("Failed to send message");

      setNewMessage("");
      await fetchMessages(bookingId);
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setSendingMessage(false);
    }
  };

  const handleNegotiatePrice = async (bookingId: number) => {
    const price = parseFloat(negotiatePrice);
    if (!price || price <= 0) {
      alert("Please enter a valid price");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${API_URL}/bookings/${bookingId}/negotiate`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ negotiatedPrice: price }),
        }
      );

      if (!response.ok) throw new Error("Failed to negotiate price");

      alert("Price negotiation sent!");
      setNegotiatePrice("");
      fetchBookings(false);
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Confirmed":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      case "Pending":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
      case "Cancelled":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
      case "Completed":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
      default:
        return "bg-muted text-foreground dark:bg-muted/50 dark:text-muted-foreground";
    }
  };

  const filteredBookings =
    filter === "all" ? bookings : bookings.filter((b) => b.status === filter);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 bg-background min-h-screen">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-400 px-4 py-3 rounded">
          Error: {error}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 bg-background min-h-screen">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Manage Bookings
        </h1>
        <p className="text-muted-foreground">
          View and manage all bookings for your venues
        </p>
      </div>

      {/* Filter Buttons */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setFilter("all")}
          className={`px-4 py-2 rounded-md transition-colors ${
            filter === "all"
              ? "bg-primary text-primary-foreground"
              : "bg-card text-foreground border border-border hover:bg-accent"
          }`}
        >
          All
        </button>
        <button
          onClick={() => setFilter("Pending")}
          className={`px-4 py-2 rounded-md transition-colors ${
            filter === "Pending"
              ? "bg-primary text-primary-foreground"
              : "bg-card text-foreground border border-border hover:bg-accent"
          }`}
        >
          Pending
        </button>
        <button
          onClick={() => setFilter("Confirmed")}
          className={`px-4 py-2 rounded-md transition-colors ${
            filter === "Confirmed"
              ? "bg-primary text-primary-foreground"
              : "bg-card text-foreground border border-border hover:bg-accent"
          }`}
        >
          Confirmed
        </button>
        <button
          onClick={() => setFilter("Completed")}
          className={`px-4 py-2 rounded-md transition-colors ${
            filter === "Completed"
              ? "bg-primary text-primary-foreground"
              : "bg-card text-foreground border border-border hover:bg-accent"
          }`}
        >
          Completed
        </button>
      </div>

      {/* Bookings Table */}
      <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
        {filteredBookings.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold text-foreground mb-2">
              No bookings found
            </h3>
            <p className="text-muted-foreground">
              {filter === "all"
                ? "No bookings have been made yet"
                : `No ${filter.toLowerCase()} bookings`}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-accent">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Guest
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Venue
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Date & Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-card">
                {filteredBookings.map((booking) => (
                  <Fragment key={booking.id}>
                    <tr className="hover:bg-accent transition-colors border-b border-border">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-foreground">
                          {booking.user.name}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {booking.user.email}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-foreground">
                          {booking.venue.name}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {booking.venue.location.city},{" "}
                          {booking.venue.location.state}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-foreground">
                          {new Date(booking.startDateTime).toLocaleDateString()}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(booking.startDateTime).toLocaleTimeString()}{" "}
                          - {new Date(booking.endDateTime).toLocaleTimeString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-foreground">
                          Rs {booking.totalPrice.toLocaleString()}
                        </div>
                        {booking.negotiatedPrice && (
                          <div className="text-xs text-green-600 dark:text-green-400">
                            Negotiated: Rs{" "}
                            {booking.negotiatedPrice.toLocaleString()}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(
                            booking.status
                          )}`}
                        >
                          {booking.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => toggleMessages(booking.id)}
                            className="text-primary hover:text-primary/80 transition-colors p-1"
                            title="Messages"
                          >
                            <MessageSquare className="w-5 h-5" />
                          </button>
                          {booking.status === "Pending" && (
                            <>
                              <button
                                onClick={() =>
                                  handleStatusUpdate(booking.id, "Confirmed")
                                }
                                className="text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 transition-colors"
                              >
                                Confirm
                              </button>
                              <button
                                onClick={() =>
                                  handleStatusUpdate(booking.id, "Cancelled")
                                }
                                className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                              >
                                Reject
                              </button>
                            </>
                          )}
                          {booking.status === "Confirmed" && (
                            <button
                              onClick={() =>
                                handleStatusUpdate(booking.id, "Completed")
                              }
                              className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                            >
                              Mark Complete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>

                    {/* Expandable Message Panel */}
                    {expandedBooking === booking.id && (
                      <tr>
                        <td colSpan={6} className="px-6 py-4 bg-accent/50">
                          <div className="space-y-4">
                            {/* Negotiate Price */}
                            <div className="bg-card border border-border rounded-lg p-4">
                              <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                                <DollarSign className="w-4 h-4" />
                                Negotiate Price
                              </h4>
                              <div className="flex gap-2">
                                <input
                                  type="number"
                                  value={negotiatePrice}
                                  onChange={(e) =>
                                    setNegotiatePrice(e.target.value)
                                  }
                                  placeholder="Enter new price"
                                  className="flex-1 px-3 py-2 bg-background border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                                />
                                <button
                                  onClick={() =>
                                    handleNegotiatePrice(booking.id)
                                  }
                                  className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
                                >
                                  Send Offer
                                </button>
                              </div>
                            </div>

                            {/* Messages */}
                            <div className="bg-card border border-border rounded-lg p-4">
                              <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                                <MessageSquare className="w-4 h-4" />
                                Messages
                              </h4>

                              {/* Message List */}
                              <div className="space-y-2 mb-4 max-h-60 overflow-y-auto">
                                {messages[booking.id] &&
                                messages[booking.id].length > 0 ? (
                                  messages[booking.id].map((msg) => (
                                    <div
                                      key={msg.id}
                                      className="bg-background rounded-lg p-3 text-sm"
                                    >
                                      <div className="flex items-start justify-between mb-1">
                                        <span className="font-medium text-foreground">
                                          {msg.sender.name}
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                          {new Date(
                                            msg.createdAt
                                          ).toLocaleString()}
                                        </span>
                                      </div>
                                      <p className="text-foreground">
                                        {msg.message}
                                      </p>
                                    </div>
                                  ))
                                ) : (
                                  <p className="text-sm text-muted-foreground text-center py-4">
                                    No messages yet. Start the conversation!
                                  </p>
                                )}
                              </div>

                              {/* Send Message */}
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  value={newMessage}
                                  onChange={(e) =>
                                    setNewMessage(e.target.value)
                                  }
                                  onKeyPress={(e) => {
                                    if (e.key === "Enter" && !sendingMessage) {
                                      handleSendMessage(booking.id);
                                    }
                                  }}
                                  placeholder="Type your message..."
                                  className="flex-1 px-3 py-2 bg-background border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                                  disabled={sendingMessage}
                                />
                                <button
                                  onClick={() => handleSendMessage(booking.id)}
                                  disabled={
                                    sendingMessage || !newMessage.trim()
                                  }
                                  className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                  <Send className="w-4 h-4" />
                                  Send
                                </button>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
