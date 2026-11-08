"use client";

import { useEffect, useState, useRef } from "react";
import { MessageSquare, Send, Building2 } from "lucide-react";
import { API_URL } from "@/lib/api";

interface Booking {
  id: number;
  startDateTime: string;
  totalPrice: number;
  negotiatedPrice?: number;
  status: string;
  venue: {
    id: number;
    name: string;
    location: {
      city: string;
      state: string;
    };
  };
  unreadCount?: number;
}

interface Message {
  id: number;
  message: string;
  isRead: boolean;
  createdAt: string;
  sender: {
    id: number;
    name: string;
  };
}

export default function UserNegotiations() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<number>(0);
  const [offeredPrice, setOfferedPrice] = useState<string>("");
  const [sendingOffer, setSendingOffer] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Get current user ID
    const userStr = localStorage.getItem("user");
    if (userStr) {
      const user = JSON.parse(userStr);
      setCurrentUserId(user.id);
    }
    fetchBookings();
  }, []);

  useEffect(() => {
    if (selectedBooking) {
      fetchMessages(selectedBooking.id);
    }
  }, [selectedBooking]);

  useEffect(() => {
    // Auto-scroll to bottom when messages change
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_URL}/bookings`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error("Failed to fetch bookings");

      const data = await response.json();
      // Handle paginated response format
      const bookingsArray = data.bookings || data;
      setBookings(Array.isArray(bookingsArray) ? bookingsArray : []);
    } catch (err: any) {
      console.error("Error fetching bookings:", err);
      setBookings([]); // Set empty array on error
    } finally {
      setLoading(false);
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
      setMessages(data);
    } catch (err: any) {
      console.error("Error fetching messages:", err);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedBooking) return;

    try {
      setSendingMessage(true);
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${API_URL}/bookings/${selectedBooking.id}/messages`,
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
      await fetchMessages(selectedBooking.id);
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setSendingMessage(false);
    }
  };

  const handleOfferPrice = async () => {
    if (!offeredPrice.trim() || !selectedBooking) return;

    const price = parseFloat(offeredPrice);
    if (isNaN(price) || price <= 0) {
      alert("Please enter a valid price");
      return;
    }

    try {
      setSendingOffer(true);
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${API_URL}/bookings/${selectedBooking.id}/negotiate`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ negotiatedPrice: price }),
        }
      );

      if (!response.ok) throw new Error("Failed to send price offer");

      setOfferedPrice("");
      // Refresh bookings to show updated price
      await fetchBookings();
      // Update selected booking
      const updatedBooking = await response.json();
      setSelectedBooking(updatedBooking);
      alert("Price offer sent successfully!");
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setSendingOffer(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Bookings List */}
      <div className="w-80 border-r border-border bg-card overflow-y-auto">
        <div className="p-6 border-b border-border">
          <h1 className="text-2xl font-bold text-foreground">Negotiations</h1>
          <p className="text-sm text-muted-foreground">
            {bookings.length} bookings
          </p>
        </div>

        <div className="divide-y divide-border">
          {bookings.length === 0 ? (
            <div className="p-6 text-center">
              <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground mb-3 opacity-50" />
              <p className="text-muted-foreground">No bookings yet</p>
            </div>
          ) : (
            bookings.map((booking) => (
              <button
                key={booking.id}
                onClick={() => setSelectedBooking(booking)}
                className={`w-full p-4 text-left hover:bg-accent transition-colors ${
                  selectedBooking?.id === booking.id ? "bg-accent" : ""
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-primary" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium text-foreground truncate">
                        {booking.venue.name}
                      </p>
                      {booking.unreadCount && booking.unreadCount > 0 && (
                        <span className="bg-primary text-primary-foreground text-xs rounded-full px-2 py-0.5">
                          {booking.unreadCount}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate mb-1">
                      {booking.venue.location.city},{" "}
                      {booking.venue.location.state}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(booking.startDateTime).toLocaleDateString()} •{" "}
                      <span
                        className={
                          booking.status === "Confirmed"
                            ? "text-green-600 dark:text-green-400"
                            : booking.status === "Pending"
                            ? "text-yellow-600 dark:text-yellow-400"
                            : "text-red-600 dark:text-red-400"
                        }
                      >
                        {booking.status}
                      </span>
                    </p>
                    {booking.negotiatedPrice && (
                      <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                        Negotiated: Rs{" "}
                        {booking.negotiatedPrice.toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 flex flex-col">
        {selectedBooking ? (
          <>
            {/* Chat Header */}
            <div className="p-6 border-b border-border bg-card">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-semibold text-foreground">
                    {selectedBooking.venue.name}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {new Date(
                      selectedBooking.startDateTime
                    ).toLocaleDateString()}{" "}
                    • Rs {selectedBooking.totalPrice.toLocaleString()}
                    {selectedBooking.negotiatedPrice && (
                      <span className="text-green-600 dark:text-green-400">
                        {" "}
                        → Rs {selectedBooking.negotiatedPrice.toLocaleString()}
                      </span>
                    )}
                  </p>
                </div>
              </div>

              {/* Price Offer Section */}
              <div className="bg-accent/50 rounded-lg p-3">
                <label className="block text-xs font-medium text-muted-foreground mb-2">
                  Offer Your Price
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-2 text-sm text-muted-foreground">
                      Rs
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={offeredPrice}
                      onChange={(e) => setOfferedPrice(e.target.value)}
                      placeholder="Enter your offer"
                      className="w-full pl-10 pr-3 py-2 bg-background border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      disabled={sendingOffer}
                    />
                  </div>
                  <button
                    onClick={handleOfferPrice}
                    disabled={sendingOffer || !offeredPrice.trim()}
                    className="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                  >
                    {sendingOffer ? "Sending..." : "Send Offer"}
                  </button>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <MessageSquare className="w-16 h-16 text-muted-foreground mb-4 opacity-50" />
                  <p className="text-muted-foreground">
                    No messages yet. Start the conversation!
                  </p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isMyMessage = msg.sender?.id === currentUserId;
                  return (
                    <div
                      key={msg.id}
                      className={`flex ${
                        isMyMessage ? "justify-end" : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-[70%] rounded-lg p-3 ${
                          isMyMessage
                            ? "bg-primary text-primary-foreground"
                            : "bg-accent"
                        }`}
                      >
                        <p className="text-xs font-semibold mb-1 opacity-70">
                          {msg.sender?.name || "Unknown"}
                        </p>
                        <p className="text-sm mb-1">{msg.message}</p>
                        <p className="text-xs opacity-70">
                          {new Date(msg.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="p-6 border-t border-border bg-card">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === "Enter" && !sendingMessage) {
                      handleSendMessage();
                    }
                  }}
                  placeholder="Type your message..."
                  className="flex-1 px-4 py-2 bg-background border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  disabled={sendingMessage}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={sendingMessage || !newMessage.trim()}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  Send
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageSquare className="mx-auto h-16 w-16 text-muted-foreground mb-4 opacity-50" />
              <p className="text-lg font-medium text-foreground mb-1">
                No booking selected
              </p>
              <p className="text-muted-foreground">
                Choose a booking from the list to start negotiating
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
