"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Building2, Plus, Edit, Trash2, Eye } from "lucide-react";
import { API_URL } from "@/lib/api";

interface Venue {
  id: number;
  name: string;
  description: string;
  capacity: number;
  price: number;
  images: string[];
  amenities: string[];
  location: {
    address: string;
    city: string;
    state: string;
    zipCode: string;
  };
  _count?: {
    bookings: number;
  };
}

export default function VendorVenues() {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchVenues(true);
    const interval = setInterval(() => fetchVenues(false), 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchVenues = async (isInitialLoad: boolean) => {
    try {
      if (isInitialLoad) setLoading(true);
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_URL}/vendor/venues`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error("Failed to fetch venues");

      const data = await response.json();
      setVenues(data);
      setError("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      if (isInitialLoad) setLoading(false);
    }
  };

  const handleDelete = async (venueId: number) => {
    if (!confirm("Are you sure you want to delete this venue?")) return;

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${API_URL}/vendor/venues/${venueId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) throw new Error("Failed to delete venue");

      fetchVenues(false);
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

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
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">My Venues</h1>
          <p className="text-muted-foreground">
            Manage your venues and create new listings
          </p>
        </div>
        <Link
          href="/vendor/venues/new"
          className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-md flex items-center gap-2 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add New Venue
        </Link>
      </div>

      {venues.length === 0 ? (
        <div className="bg-card border border-border rounded-lg p-12 text-center">
          <Building2 className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold text-foreground mb-2">
            No venues yet
          </h3>
          <p className="text-muted-foreground mb-6">
            Start by adding your first venue to begin receiving bookings
          </p>
          <Link
            href="/vendor/venues/new"
            className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-3 rounded-md transition-colors"
          >
            <Plus className="w-5 h-5" />
            Add Your First Venue
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {venues.map((venue) => (
            <div
              key={venue.id}
              className="bg-card border border-border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="h-48 bg-accent relative">
                {venue.images && venue.images.length > 0 ? (
                  <img
                    src={venue.images[0]}
                    alt={venue.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <Building2 className="w-16 h-16 text-muted-foreground" />
                  </div>
                )}
              </div>
              <div className="p-6">
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  {venue.name}
                </h3>
                <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
                  {venue.description}
                </p>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Capacity</p>
                    <p className="text-lg font-semibold text-foreground">
                      {venue.capacity} guests
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Price</p>
                    <p className="text-lg font-semibold text-primary">
                      Rs {venue.price}
                    </p>
                  </div>
                </div>
                <div className="mb-4">
                  <p className="text-sm text-muted-foreground mb-1">
                    Total Bookings
                  </p>
                  <p className="text-lg font-semibold text-foreground">
                    {venue._count?.bookings || 0}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Link
                    href={`/venues/${venue.id}`}
                    className="flex-1 flex items-center justify-center gap-2 bg-accent hover:bg-accent/80 text-foreground px-4 py-2 rounded-md transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                    View
                  </Link>
                  <Link
                    href={`/vendor/venues/${venue.id}/edit`}
                    className="flex-1 flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-md transition-colors"
                  >
                    <Edit className="w-4 h-4" />
                    Edit
                  </Link>
                  <button
                    onClick={() => handleDelete(venue.id)}
                    className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700 text-white px-4 py-2 rounded-md transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
