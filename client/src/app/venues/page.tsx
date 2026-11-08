"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useAuth } from "@/app/(auth)/authProvider";
import Navbar from "@/components/Navbar";
import VenueCard from "@/components/VenueCard";
import VenueFilters from "@/components/VenueFilters";
// mapbox-gl is ~450 kB of JavaScript: load it in its own chunk, in the
// browser only, after the venue list has rendered.
const VenueMap = dynamic(() => import("@/components/VenueMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full min-h-[300px] items-center justify-center text-sm opacity-60">
      Loading map…
    </div>
  ),
});
import api from "@/lib/api";
import { Venue } from "@/types";
import Footer from "@/components/Footer";
import { RevealLines, FadeIn } from "@/components/motion/Reveal";
import { Map as MapIcon, SearchX } from "lucide-react";

interface FilterValues {
  venueType: string;
  minPrice: string;
  maxPrice: string;
  minCapacity: string;
  maxCapacity: string;
  city: string;
  sortBy: string;
  sortOrder: string;
}

export default function VenuesPage() {
  const { loading: authLoading, isAuthenticated, user } = useAuth();
  const router = useRouter();
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [highlightedVenueId, setHighlightedVenueId] = useState<number | null>(
    null
  );
  const [showMap, setShowMap] = useState(true);
  const [filtersKey, setFiltersKey] = useState(0);
  const [filters, setFilters] = useState<FilterValues>({
    venueType: "",
    minPrice: "",
    maxPrice: "",
    minCapacity: "",
    maxCapacity: "",
    city: "",
    sortBy: "postedDate",
    sortOrder: "desc",
  });

  // Redirect vendors to their dashboard
  useEffect(() => {
    if (!authLoading && user?.role === "USER" && user?.isVendor) {
      router.push("/vendor");
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    fetchVenues();
  }, [filters]);

  const fetchVenues = async () => {
    try {
      setLoading(true);
      setError(null);

      // Build query params
      const params: any = {};
      if (filters.venueType) params.venueType = filters.venueType;
      if (filters.minPrice) params.minPrice = filters.minPrice;
      if (filters.maxPrice) params.maxPrice = filters.maxPrice;
      if (filters.minCapacity) params.minCapacity = filters.minCapacity;
      if (filters.maxCapacity) params.maxCapacity = filters.maxCapacity;
      if (filters.city) params.city = filters.city;
      if (filters.sortBy) params.sortBy = filters.sortBy;
      if (filters.sortOrder) params.sortOrder = filters.sortOrder;

      // Get user location for distance sorting
      if (filters.sortBy === "distance" && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            params.userLat = position.coords.latitude;
            params.userLon = position.coords.longitude;
            await fetchVenuesWithParams(params);
          },
          async () => {
            // If geolocation fails, fetch without location
            await fetchVenuesWithParams(params);
          }
        );
      } else {
        await fetchVenuesWithParams(params);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to fetch venues");
      setLoading(false);
    }
  };

  const fetchVenuesWithParams = async (params: any) => {
    const response = await api.get("/venues", { params });
    setVenues(response.data.venues || []);
    setLoading(false);
  };

  const handleFilterChange = (newFilters: FilterValues) => {
    setFilters(newFilters);
  };

  const handleMarkerClick = (venueId: number) => {
    setHighlightedVenueId(venueId);
    // Scroll to venue card
    const element = document.getElementById(`venue-${venueId}`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-border border-t-primary"></div>
          <p className="eyebrow mt-4">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="mx-auto max-w-[1440px] px-5 pb-24 pt-10 sm:px-8 lg:px-12">
        {/* Header */}
        <header className="mb-12 grid gap-8 border-b border-border pb-10 md:grid-cols-12 md:items-end">
          <div className="md:col-span-8">
            <FadeIn immediate>
              <span className="eyebrow">(Venues) — Browse &amp; book</span>
            </FadeIn>
            <RevealLines
              as="h1"
              immediate
              delay={0.05}
              className="mt-5 font-display text-[clamp(3.25rem,8vw,8rem)] leading-[0.88] tracking-tightest"
              lines={["Discover perfect", <span key="b" className="italic text-primary">venues</span>]}
            />
          </div>
          <FadeIn immediate delay={0.3} className="flex flex-col gap-6 md:col-span-4 md:items-end md:text-right">
            <p className="max-w-xs text-muted-foreground">
              Browse and book event venues for any occasion
            </p>
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground">
                {loading ? (
                  "Loading venues..."
                ) : (
                  <>
                    Found <span className="text-foreground">{venues.length}</span> venues
                  </>
                )}
              </span>
              {/* Toggle View Button */}
              <button
                onClick={() => setShowMap(!showMap)}
                aria-pressed={showMap}
                className="btn-ghost h-10 px-4 py-0"
              >
                <MapIcon className="h-4 w-4" />
                {showMap ? "Hide Map" : "Show Map"}
              </button>
            </div>
          </FadeIn>
        </header>

        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
          {/* Filters Sidebar */}
          <aside className="lg:col-span-3">
            <div className="lg:sticky lg:top-24">
              <VenueFilters key={filtersKey} onFilterChange={handleFilterChange} />
            </div>
          </aside>

          {/* Main Content */}
          <div className="lg:col-span-9">
            {/* Map */}
            {showMap && (
              <div className="relative mb-12 h-[26rem] overflow-hidden rounded-[1.75rem] border-[3px] border-forest bg-card shadow-sticker dark:border-lime animate-in fade-in duration-700">
                <VenueMap
                  venues={venues}
                  onMarkerClick={handleMarkerClick}
                  highlightedVenueId={highlightedVenueId || undefined}
                />
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="mb-6 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
                {error}
              </div>
            )}

            {/* Loading State */}
            {loading && (
              <div className="grid grid-cols-1 gap-x-6 gap-y-12 md:grid-cols-2 xl:grid-cols-3">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="animate-pulse">
                    <div className="aspect-[4/3] rounded-2xl bg-muted"></div>
                    <div className="mt-4 h-6 w-2/3 rounded-full bg-muted"></div>
                    <div className="mt-3 h-4 w-1/2 rounded-full bg-muted"></div>
                    <div className="mt-3 h-4 w-full rounded-full bg-muted"></div>
                  </div>
                ))}
              </div>
            )}

            {/* Venue Grid */}
            {!loading && venues.length > 0 && (
              <div className="grid grid-cols-1 gap-x-6 gap-y-14 md:grid-cols-2 xl:grid-cols-3">
                {venues.map((venue) => (
                  <div key={venue.id} id={`venue-${venue.id}`} className="scroll-mt-28">
                    <VenueCard
                      venue={venue}
                      isHighlighted={highlightedVenueId === venue.id}
                      onFavoriteToggle={fetchVenues}
                    />
                  </div>
                ))}
              </div>
            )}

            {/* No Results */}
            {!loading && venues.length === 0 && (
              <div className="flex flex-col items-center rounded-[1.75rem] border-[3px] border-dashed border-forest/40 px-6 py-20 text-center">
                <span className="grid h-16 w-16 place-items-center rounded-full bg-muted">
                  <SearchX className="h-7 w-7 text-muted-foreground" />
                </span>
                <h3 className="mt-6 font-display text-4xl text-foreground">No venues found</h3>
                <p className="mt-2 text-muted-foreground">
                  Try adjusting your filters to see more results
                </p>
                <button
                  onClick={() => {
                    setFilters({
                      venueType: "",
                      minPrice: "",
                      maxPrice: "",
                      minCapacity: "",
                      maxCapacity: "",
                      city: "",
                      sortBy: "postedDate",
                      sortOrder: "desc",
                    });
                    setFiltersKey((k) => k + 1);
                  }}
                  className="btn-primary mt-8"
                >
                  Clear Filters
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
