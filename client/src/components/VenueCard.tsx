"use client";

import { Venue } from "@/types";
import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/app/(auth)/authProvider";
import api from "@/lib/api";
import { ArrowUpRight, Heart, MapPin, Star, Users } from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { cn } from "@/lib/utils";
import { Tape } from "@/components/fun/Craft";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

interface VenueCardProps {
  venue: Venue;
  isHighlighted?: boolean;
  onFavoriteToggle?: () => void;
}

export default function VenueCard({
  venue,
  isHighlighted = false,
  onFavoriteToggle,
}: VenueCardProps) {
  const { isAuthenticated, loading, user } = useAuth();
  const [isFavorited, setIsFavorited] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [favoriteId, setFavoriteId] = useState<number | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const mediaRef = useRef<HTMLDivElement>(null);

  // Card drops in like a sticker when it scrolls into view
  useEffect(() => {
    if (!cardRef.current) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        cardRef.current,
        { opacity: 0, y: 40, rotate: gsap.utils.random(-6, 6) },
        {
          opacity: 1,
          y: 0,
          rotate: 0,
          duration: 0.8,
          ease: "back.out(1.6)",
          clearProps: "transform",
          scrollTrigger: { trigger: cardRef.current, start: "top 92%", once: true },
        }
      );
    }, cardRef);
    return () => ctx.revert();
  }, []);

  // Dynamically check favorite status when component mounts or auth changes
  useEffect(() => {
    const checkFavoriteStatus = async () => {
      if (!isAuthenticated || loading) return;

      try {
        const response = await api.get(`/favorites/check/${venue.id}`);
        setIsFavorited(response.data.isFavorite);
        setFavoriteId(response.data.favoriteId || null);
      } catch (error) {
        console.error("Failed to check favorite status:", error);
      }
    };

    checkFavoriteStatus();
  }, [venue.id, isAuthenticated, loading]);

  const handleFavoriteToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (loading) return;

    if (!isAuthenticated) {
      window.location.href = `/signin?redirect=/venues/${venue.id}`;
      return;
    }

    setIsLoading(true);

    // Little pop on the heart
    const target = e.currentTarget;
    gsap.fromTo(
      target,
      { scale: 0.7 },
      { scale: 1, duration: 0.6, ease: "elastic.out(1, 0.4)" }
    );

    try {
      if (isFavorited && favoriteId) {
        await api.delete(`/favorites/${favoriteId}`);
        setIsFavorited(false);
        setFavoriteId(null);
      } else {
        const response = await api.post("/favorites", { venueId: venue.id });
        setIsFavorited(true);
        setFavoriteId(response.data.id);
      }
      onFavoriteToggle?.();
    } catch (error) {
      console.error("Error toggling favorite:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Link href={`/venues/${venue.id}`} className="group block">
      <div
        ref={cardRef}
        className={cn(
          "relative rounded-[1.75rem] border-[3px] border-forest bg-card p-3 shadow-sticker transition-[transform,box-shadow] duration-500 ease-bounce group-hover:-translate-y-1.5 group-hover:-rotate-1 group-hover:shadow-sticker-lg dark:border-lime",
          isHighlighted && "ring-4 ring-lime ring-offset-4 ring-offset-background"
        )}
      >
        <Tape className="-top-4 left-1/2 -ml-14 opacity-0 transition-opacity duration-300 group-hover:opacity-100" tilt={-3} />
        <div className="relative">
        <div
          ref={mediaRef}
          className="relative aspect-[4/3] overflow-hidden rounded-[1.25rem] border-[3px] border-forest bg-muted dark:border-lime"
        >
          {venue.photoUrls && venue.photoUrls.length > 0 ? (
            <img
              src={venue.photoUrls[0]}
              alt={venue.name}
              className="h-full w-full object-cover transition-transform duration-700 ease-expo group-hover:scale-[1.08]"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center font-display uppercase tracking-widest text-muted-foreground">
              No image available
            </div>
          )}

          <span className="absolute left-3 top-3 -rotate-3 rounded-lg border-2 border-forest bg-paper px-2.5 py-1 font-display text-xs uppercase tracking-[0.08em] text-forest">
            {venue.venueType.replace(/([A-Z])/g, " $1").trim()}
          </span>

          <button
            onClick={handleFavoriteToggle}
            disabled={isLoading}
            aria-label={isFavorited ? "Remove from favorites" : "Add to favorites"}
            aria-pressed={isFavorited}
            className="absolute right-3 top-3 grid h-11 w-11 place-items-center rounded-full border-2 border-forest bg-paper text-forest transition-transform duration-300 ease-bounce hover:scale-110"
          >
            <Heart
              className={cn("h-5 w-5", isFavorited ? "fill-bubblegum text-bubblegum" : "")}
            />
          </button>

          {venue.rating && venue.rating > 0 ? (
            <span className="absolute bottom-3 left-3 flex items-center gap-1 rounded-full border-2 border-forest bg-sunny px-2.5 py-0.5 text-xs font-bold text-forest">
              <Star className="h-3.5 w-3.5 fill-forest" />
              {venue.rating.toFixed(1)}
              <span className="font-medium opacity-70">({venue.numberOfReviews})</span>
            </span>
          ) : null}
        </div>
        {/* price tag */}
        <span className="absolute -bottom-4 -right-5 rotate-6 rounded-xl border-[3px] border-forest bg-lime px-3 py-1.5 font-display text-lg uppercase leading-none text-forest shadow-sticker-sm transition-transform duration-500 ease-bounce group-hover:rotate-[-4deg] group-hover:scale-110">
          Rs {venue.pricePerDay.toLocaleString()}
          <span className="ml-1 text-xs">/day</span>
        </span>
        </div>

        <div className="px-2 pb-2 pt-4">
          <h3 data-card-text className="line-clamp-1 font-display text-[1.9rem] uppercase leading-none">
            {venue.name}
          </h3>

          <div
            data-card-text
            className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm font-medium text-muted-foreground"
          >
            <span className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4" />
              {venue.location.city}, {venue.location.state}
              {venue.distance && <span className="text-foreground">· {venue.distance} km</span>}
            </span>
            <span className="flex items-center gap-1.5">
              <Users className="h-4 w-4" />
              {venue.capacity} guests
            </span>
          </div>

          <p data-card-text className="mt-3 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
            {venue.description}
          </p>

          {venue.amenities.length > 0 && (
            <div data-card-text className="mt-4 flex flex-wrap gap-1.5">
              {venue.amenities.slice(0, 3).map((amenity, index) => (
                <span
                  key={index}
                  className="rounded-full border-2 border-forest/70 px-2.5 py-0.5 text-[11px] font-semibold dark:border-lime/60"
                >
                  {amenity}
                </span>
              ))}
              {venue.amenities.length > 3 && (
                <span className="rounded-full bg-forest px-2.5 py-0.5 text-[11px] font-semibold text-lime">
                  +{venue.amenities.length - 3}
                </span>
              )}
            </div>
          )}

          <span className="note mt-4 flex items-center gap-1 text-base text-foreground/80">
            take a look <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-1" />
          </span>
        </div>
      </div>
    </Link>
  );
}
