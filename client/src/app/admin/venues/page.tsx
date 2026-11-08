"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import { Venue } from "@/types";

interface VenueStats {
  venueId: number;
  totalBookings: number;
  totalRevenue: number;
  adminEarnings: number;
}

export default function AdminVenuesPage() {
  const router = useRouter();
  const [venues, setVenues] = useState<Venue[]>([]);
  const [venueStats, setVenueStats] = useState<Record<number, VenueStats>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchVenues();
  }, []);

  const fetchVenues = async () => {
    try {
      setLoading(true);
      const [venuesRes, statsRes] = await Promise.all([
        api.get("/venues"),
        api.get("/admin/venue-stats"),
      ]);
      setVenues(venuesRes.data.venues || venuesRes.data || []);

      // Convert stats array to object keyed by venueId
      const statsMap: Record<number, VenueStats> = {};
      (statsRes.data || []).forEach((stat: VenueStats) => {
        statsMap[stat.venueId] = stat;
      });
      setVenueStats(statsMap);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to fetch venues");
    } finally {
      setLoading(false);
    }
  };

  const getVenueStats = (venueId: number) => {
    return (
      venueStats[venueId] || {
        totalBookings: 0,
        totalRevenue: 0,
        adminEarnings: 0,
      }
    );
  };

  if (loading) {
    return (
      <div className="p-8 bg-background min-h-screen">
        <h1 className="text-2xl font-bold text-foreground mb-6">
          Manage Venues
        </h1>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 bg-background min-h-screen">
        <h1 className="text-2xl font-bold text-foreground mb-6">
          Manage Venues
        </h1>
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
          <p className="text-red-700 dark:text-red-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 bg-background min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-foreground">View All Venues</h1>
      </div>

      <div className="bg-card rounded-lg shadow-md overflow-hidden border border-border">
        <table className="min-w-full divide-y divide-border">
          <thead className="bg-accent">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Venue
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Location
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Price/Hour
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Capacity
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Total Bookings
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Admin Earnings (15%)
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-card divide-y divide-border">
            {venues.map((venue) => (
              <tr key={venue.id} className="hover:bg-accent transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center">
                    {venue.photoUrls?.[0] && (
                      <img
                        src={venue.photoUrls[0]}
                        alt={venue.name}
                        className="h-12 w-12 rounded-md object-cover mr-3"
                      />
                    )}
                    <div>
                      <div className="text-sm font-medium text-foreground">
                        {venue.name}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {venue.rating || 0} ★
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 py-1 text-xs font-medium bg-primary/10 text-primary rounded-full">
                    {venue.venueType.replace(/([A-Z])/g, " $1").trim()}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-foreground">
                    {venue.location.city}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {venue.location.state}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                  Rs {venue.pricePerDay}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                  {venue.capacity} people
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                  {getVenueStats(venue.id).totalBookings}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 dark:text-green-400">
                  Rs {getVenueStats(venue.id).adminEarnings.toFixed(2)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <Link
                    href={`/venues/${venue.id}`}
                    className="text-primary hover:text-primary/80 transition-colors"
                  >
                    View Details
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {venues.length === 0 && (
        <div className="text-center py-12 bg-card rounded-lg shadow-md mt-6 border border-border">
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
              d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
            />
          </svg>
          <h2 className="text-xl font-semibold text-foreground mb-2">
            No venues yet
          </h2>
          <p className="text-muted-foreground mb-6">
            Venues will appear here once vendors create them.
          </p>
        </div>
      )}
    </div>
  );
}
