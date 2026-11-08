"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import VenueCard from "@/components/VenueCard";
import { Venue } from "@/types";

export default function FavoritesPage() {
  const router = useRouter();
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchFavorites();
  }, []);

  const fetchFavorites = async () => {
    try {
      setLoading(true);
      const response = await api.get("/favorites");
      setVenues(response.data.map((fav: any) => fav.venue));
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to fetch favorites");
    } finally {
      setLoading(false);
    }
  };

  const handleFavoriteRemoved = (venueId: number) => {
    setVenues(venues.filter((v) => v.id !== venueId));
  };

  if (loading) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold text-foreground mb-6">
          My Favorites
        </h1>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold text-foreground mb-6">My Favorites</h1>
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-700">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-foreground mb-6">My Favorites</h1>

      {venues.length === 0 ? (
        <div className="text-center py-12 bg-card border border-border rounded-lg shadow-md">
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
              d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
            />
          </svg>
          <h2 className="text-xl font-semibold text-foreground mb-2">
            No favorites yet
          </h2>
          <p className="text-muted-foreground mb-6">Start saving venues you love!</p>
          <button
            onClick={() => router.push("/venues")}
            className="px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
          >
            Browse Venues
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {venues.map((venue) => (
            <VenueCard key={venue.id} venue={venue} />
          ))}
        </div>
      )}
    </div>
  );
}
