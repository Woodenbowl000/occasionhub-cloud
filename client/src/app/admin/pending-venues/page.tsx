"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/app/(auth)/authProvider";
import { useRouter } from "next/navigation";
import api from "@/lib/api";

interface PendingVenue {
  id: number;
  name: string;
  description: string;
  venueType: string;
  capacity: number;
  pricePerDay: number;
  amenities: string[];
  photoUrls: string[];
  postedDate: string;
  vendor: {
    id: number;
    name: string;
    email: string;
  };
  location: {
    address: string;
    city: string;
    state: string;
    country: string;
  };
}

export default function PendingVenuesPage() {
  const router = useRouter();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [venues, setVenues] = useState<PendingVenue[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedVenue, setSelectedVenue] = useState<PendingVenue | null>(null);

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated || user?.role !== "ADMIN") {
        router.push("/signin");
      } else {
        fetchPendingVenues();
      }
    }
  }, [isAuthenticated, authLoading, user, router]);

  const fetchPendingVenues = async () => {
    try {
      setLoading(true);
      const response = await api.get("/admin/venues/pending");
      setVenues(response.data);
    } catch (error) {
      console.error("Failed to fetch pending venues:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (venueId: number) => {
    if (!confirm("Are you sure you want to approve this venue?")) {
      return;
    }

    setActionLoading(true);
    try {
      await api.post(`/admin/venues/${venueId}/approve`);
      alert("Venue approved successfully!");
      fetchPendingVenues();
      setSelectedVenue(null);
    } catch (error: any) {
      alert(error.response?.data?.message || "Failed to approve venue");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (venueId: number) => {
    if (
      !confirm(
        "Are you sure you want to reject and delete this venue? This action cannot be undone!"
      )
    ) {
      return;
    }

    setActionLoading(true);
    try {
      await api.delete(`/admin/venues/${venueId}/reject`);
      alert("Venue rejected and deleted");
      fetchPendingVenues();
      setSelectedVenue(null);
    } catch (error: any) {
      alert(error.response?.data?.message || "Failed to reject venue");
    } finally {
      setActionLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">
          Pending Venue Approvals
        </h1>
        <p className="text-muted-foreground mt-2">
          Review and approve venues submitted by vendors
        </p>
      </div>

      {venues.length === 0 ? (
        <div className="text-center py-12 bg-accent rounded-lg">
          <p className="text-muted-foreground">No pending venues to review</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {venues.map((venue) => (
            <div
              key={venue.id}
              className="bg-card shadow-md rounded-lg overflow-hidden border border-border"
            >
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-foreground">
                      {venue.name}
                    </h3>
                    <p className="text-muted-foreground mt-1">
                      {venue.venueType.replace(/([A-Z])/g, " $1").trim()}
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Submitted by: <strong>{venue.vendor.name}</strong> (
                      {venue.vendor.email})
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Date: {new Date(venue.postedDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-primary-600">
                      Rs {venue.pricePerDay}/day
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Capacity: {venue.capacity}
                    </p>
                  </div>
                </div>

                <div className="mb-4">
                  <p className="text-muted-foreground">{venue.description}</p>
                </div>

                <div className="mb-4">
                  <p className="text-sm font-semibold text-muted-foreground mb-2">
                    Location:
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {venue.location.address}, {venue.location.city},{" "}
                    {venue.location.state}, {venue.location.country}
                  </p>
                </div>

                {venue.amenities.length > 0 && (
                  <div className="mb-4">
                    <p className="text-sm font-semibold text-muted-foreground mb-2">
                      Amenities:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {venue.amenities.map((amenity, index) => (
                        <span
                          key={index}
                          className="px-3 py-1 bg-muted text-muted-foreground rounded-full text-sm"
                        >
                          {amenity}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {venue.photoUrls.length > 0 && (
                  <div className="mb-4">
                    <p className="text-sm font-semibold text-muted-foreground mb-2">
                      Photos:
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {venue.photoUrls.slice(0, 3).map((url, index) => (
                        <img
                          key={index}
                          src={url}
                          alt={`${venue.name} ${index + 1}`}
                          className="w-full h-32 object-cover rounded-md"
                        />
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex space-x-4 pt-4 border-t">
                  <button
                    onClick={() => handleApprove(venue.id)}
                    disabled={actionLoading}
                    className="flex-1 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                  >
                    {actionLoading ? "Processing..." : "Approve Venue"}
                  </button>
                  <button
                    onClick={() => handleReject(venue.id)}
                    disabled={actionLoading}
                    className="flex-1 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                  >
                    {actionLoading ? "Processing..." : "Reject & Delete"}
                  </button>
                  <button
                    onClick={() =>
                      selectedVenue?.id === venue.id
                        ? setSelectedVenue(null)
                        : setSelectedVenue(venue)
                    }
                    className="px-4 py-2 border border-border text-muted-foreground rounded-md hover:bg-accent"
                  >
                    {selectedVenue?.id === venue.id
                      ? "Hide Details"
                      : "View Details"}
                  </button>
                </div>

                {selectedVenue?.id === venue.id && (
                  <div className="mt-4 p-4 bg-accent rounded-md">
                    <h4 className="font-semibold text-foreground mb-2">
                      Full Details
                    </h4>
                    <div className="space-y-2 text-sm">
                      <p>
                        <strong>Vendor ID:</strong> {venue.vendor.id}
                      </p>
                      <p>
                        <strong>Venue ID:</strong> {venue.id}
                      </p>
                      <p>
                        <strong>Full Description:</strong> {venue.description}
                      </p>
                      {venue.photoUrls.length > 0 && (
                        <div>
                          <strong>All Photo URLs:</strong>
                          <ul className="list-disc list-inside ml-4">
                            {venue.photoUrls.map((url, index) => (
                              <li key={index}>
                                <a
                                  href={url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-primary-600 hover:underline"
                                >
                                  Photo {index + 1}
                                </a>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
