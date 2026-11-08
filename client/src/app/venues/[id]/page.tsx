"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/app/(auth)/authProvider";
import Navbar from "@/components/Navbar";
import AvailabilityCalendar from "@/components/AvailabilityCalendar";
import api from "@/lib/api";
import { Venue, Booking } from "@/types";
import Footer from "@/components/Footer";
import { FadeIn, RevealLines } from "@/components/motion/Reveal";
import { ArrowLeft, Check, MapPin, Star, Users } from "lucide-react";
import { cn } from "@/lib/utils";

export default function VenueDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { isAuthenticated, user, loading: authLoading } = useAuth();
  const [venue, setVenue] = useState<Venue | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [bookingData, setBookingData] = useState({
    message: "",
    offeredPrice: "",
  });
  const [customization, setCustomization] = useState({
    theme: "",
    seating: "",
    catering: false,
    decoration: false,
    avEquipment: false,
    extraServices: "",
  });
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const bookingFormRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (params.id) {
      fetchVenue();
    }
  }, [params.id]);

  // The form renders below the calendar, usually off-screen; bring it into
  // view so picking a date visibly does something
  useEffect(() => {
    if (showBookingForm && selectedDate) {
      bookingFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [showBookingForm, selectedDate]);

  const fetchVenue = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/venues/${params.id}`);
      setVenue(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to fetch venue");
    } finally {
      setLoading(false);
    }
  };

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date ? date.toISOString() : "");
    setShowBookingForm(true);
  };

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();

    // Wait for auth to load
    if (authLoading) {
      return;
    }

    if (!isAuthenticated) {
      router.push(`/signin?redirect=/venues/${params.id}`);
      return;
    }

    if (!selectedDate) {
      setBookingError("Please select a date");
      return;
    }

    setBookingError(null);
    setBookingLoading(true);

    try {
      // Create booking for the full day (midnight to midnight)
      const bookingDate = new Date(selectedDate);
      const startDateTime = new Date(bookingDate);
      startDateTime.setHours(0, 0, 0, 0);

      const endDateTime = new Date(bookingDate);
      endDateTime.setHours(23, 59, 59, 999);

      const bookingPayload: any = {
        venueId: venue?.id,
        startDateTime: startDateTime.toISOString(),
        endDateTime: endDateTime.toISOString(),
        message: bookingData.message,
        customization: customization,
      };

      // Add offeredPrice if user provided one
      if (
        bookingData.offeredPrice &&
        parseFloat(bookingData.offeredPrice) > 0
      ) {
        bookingPayload.negotiatedPrice = parseFloat(bookingData.offeredPrice);
      }

      await api.post("/bookings", bookingPayload);
      setBookingSuccess(true);
      setShowBookingForm(false);
      setTimeout(() => {
        router.push("/dashboard/bookings");
      }, 2000);
    } catch (err: any) {
      setBookingError(
        err.response?.data?.message || "Failed to create booking"
      );
    } finally {
      setBookingLoading(false);
    }
  };

  if (loading || !venue) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex min-h-[70vh] items-center justify-center">
          <div className="text-center">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-border border-t-primary"></div>
            <p className="eyebrow mt-4">Loading venue...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="mx-auto max-w-7xl px-5 py-24 text-center">
          <h2 className="font-display text-5xl">{error}</h2>
          <button onClick={() => router.push("/venues")} className="btn-primary mt-8">
            Back to Venues
          </button>
        </div>
      </div>
    );
  }

  const photos = venue.photoUrls || [];
  const gallery = photos.slice(0, 5);

  const checkboxes = [
    { key: "catering", label: "Catering Service" },
    { key: "decoration", label: "Decoration Service" },
    { key: "avEquipment", label: "AV Equipment" },
  ] as const;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="mx-auto max-w-[1440px] px-5 pb-24 pt-6 sm:px-8 lg:px-12">
        {/* Back Button */}
        <button
          onClick={() => router.back()}
          className="group mb-10 flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <span className="grid h-9 w-9 place-items-center rounded-full border border-border transition-colors group-hover:border-foreground">
            <ArrowLeft className="h-4 w-4 transition-transform duration-500 ease-expo group-hover:-translate-x-0.5" />
          </span>
          Back to Venues
        </button>

        {/* Success Message */}
        {bookingSuccess && (
          <div className="mb-8 flex items-center gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-700 animate-in fade-in slide-in-from-top-2 dark:text-emerald-300">
            <Check className="h-4 w-4" />
            Booking created successfully! Redirecting...
          </div>
        )}

        {/* Title block */}
        <header className="mb-10 grid gap-8 md:grid-cols-12 md:items-end">
          <div className="md:col-span-9">
            <FadeIn immediate>
              <span className="eyebrow">
                {venue.venueType.replace(/([A-Z])/g, " $1").trim()} — {venue.location.city}
              </span>
            </FadeIn>
            <RevealLines
              as="h1"
              immediate
              delay={0.05}
              className="mt-5 font-display text-[clamp(3rem,7.5vw,7.5rem)] leading-[0.9] tracking-tightest text-foreground"
              lines={[venue.name]}
            />
            <FadeIn
              immediate
              delay={0.3}
              className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground"
            >
              <span className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                {venue.location.address}, {venue.location.city}, {venue.location.state}{" "}
                {venue.location.postalCode}
              </span>
              <span className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Capacity: {venue.capacity} people
              </span>
              {venue.rating && venue.rating > 0 ? (
                <span className="flex items-center gap-2">
                  <span className="flex">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={cn(
                          "h-4 w-4",
                          i < Math.floor(venue.rating!)
                            ? "fill-primary text-primary"
                            : "fill-muted text-muted"
                        )}
                      />
                    ))}
                  </span>
                  {venue.rating.toFixed(1)} ({venue.numberOfReviews} reviews)
                </span>
              ) : null}
            </FadeIn>
          </div>
          <FadeIn immediate delay={0.35} className="md:col-span-3 md:text-right">
            <p className="eyebrow">From</p>
            <p className="mt-1 font-display text-6xl leading-none text-foreground">
              Rs {venue.pricePerDay.toLocaleString()}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">per day</p>
          </FadeIn>
        </header>

        {/* Image Gallery */}
        <FadeIn immediate delay={0.2} y={60} className="mb-16">
          {gallery.length > 0 ? (
            <div
              className={cn(
                "grid gap-3",
                gallery.length === 1
                  ? "grid-cols-1"
                  : "grid-cols-2 md:h-[70vh] md:grid-cols-4 md:grid-rows-2"
              )}
            >
              {gallery.map((url, index) => (
                <div
                  key={index}
                  className={cn(
                    "group relative overflow-hidden rounded-[1.5rem] border-[3px] border-forest bg-muted dark:border-lime",
                    gallery.length === 1 && "aspect-[21/9]",
                    gallery.length > 1 && index === 0 && "col-span-2 aspect-[4/3] md:row-span-2 md:aspect-auto",
                    gallery.length > 1 && index > 0 && "aspect-square md:aspect-auto",
                    gallery.length === 2 && index === 1 && "col-span-2 md:row-span-2",
                    gallery.length === 3 && index > 0 && "md:col-span-2",
                    gallery.length === 4 && index === 3 && "md:col-span-2"
                  )}
                >
                  <img
                    src={url}
                    alt={index === 0 ? venue.name : `${venue.name} ${index + 1}`}
                    className="h-full w-full object-cover transition-transform [transition-duration:1400ms] ease-expo group-hover:scale-105"
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="flex aspect-[21/9] w-full items-center justify-center rounded-2xl bg-muted">
              <p className="eyebrow">No images available</p>
            </div>
          )}
        </FadeIn>

        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
          {/* Main Content */}
          <div className="lg:col-span-7">
            <FadeIn className="border-t border-border pt-8">
              <span className="eyebrow">(01) — Overview</span>
              <h2 className="mt-4 font-display text-5xl text-foreground">About this venue</h2>
              <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground">
                {venue.description}
              </p>
            </FadeIn>

            {/* Amenities */}
            <FadeIn className="mt-16 border-t border-border pt-8">
              <span className="eyebrow">(02) — Included</span>
              <h2 className="mt-4 font-display text-5xl text-foreground">Amenities</h2>
              <ul className="mt-8 grid grid-cols-1 sm:grid-cols-2">
                {venue.amenities.map((amenity, index) => (
                  <li
                    key={index}
                    className="flex items-center gap-3 border-b border-border py-4 text-foreground/85"
                  >
                    <span className="grid h-7 w-7 place-items-center rounded-full bg-primary/10 text-primary">
                      <Check className="h-3.5 w-3.5" />
                    </span>
                    {amenity}
                  </li>
                ))}
              </ul>
            </FadeIn>
          </div>

          {/* Booking Sidebar */}
          <div className="lg:col-span-5">
            <div className="rounded-[1.75rem] border-[3px] border-forest bg-card shadow-sticker dark:border-lime p-6 shadow-[0_30px_60px_-30px_rgba(0,0,0,0.25)] sm:p-8 lg:sticky lg:top-24">
              <span className="eyebrow">(03) — Reserve</span>
              <h2 className="mb-6 mt-3 font-display text-4xl text-foreground">
                Check Availability
              </h2>

              {/* Availability Calendar */}
              <AvailabilityCalendar
                venueId={params.id as string}
                onDateSelect={handleDateSelect}
              />

              {/* Booking Form with Customization */}
              {showBookingForm && selectedDate && (
                <form
                  ref={bookingFormRef}
                  onSubmit={handleBooking}
                  className="mt-8 space-y-5 border-t border-border pt-8 animate-in fade-in slide-in-from-bottom-4 duration-700"
                >
                  {bookingError && (
                    <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                      {bookingError}
                    </div>
                  )}

                  <h3 className="font-display text-3xl text-foreground">Event Customization</h3>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="field-label">Theme</label>
                      <select
                        value={customization.theme}
                        onChange={(e) =>
                          setCustomization({
                            ...customization,
                            theme: e.target.value,
                          })
                        }
                        className="field"
                      >
                        <option value="">Select Theme</option>
                        <option value="elegant">Elegant</option>
                        <option value="rustic">Rustic</option>
                        <option value="modern">Modern</option>
                        <option value="traditional">Traditional</option>
                        <option value="garden">Garden</option>
                      </select>
                    </div>

                    <div>
                      <label className="field-label">Seating Arrangement</label>
                      <select
                        value={customization.seating}
                        onChange={(e) =>
                          setCustomization({
                            ...customization,
                            seating: e.target.value,
                          })
                        }
                        className="field"
                      >
                        <option value="">Select Seating</option>
                        <option value="theater">Theater Style</option>
                        <option value="classroom">Classroom Style</option>
                        <option value="banquet">Banquet Style</option>
                        <option value="cocktail">Cocktail Style</option>
                        <option value="uShape">U-Shape</option>
                      </select>
                    </div>
                  </div>

                  <fieldset>
                    <legend className="field-label">Additional Services</legend>
                    <div className="flex flex-wrap gap-2">
                      {checkboxes.map(({ key, label }) => (
                        <label
                          key={key}
                          className={cn(
                            "flex cursor-pointer items-center gap-2 rounded-full border px-4 py-2 text-sm transition-colors duration-300",
                            customization[key]
                              ? "border-foreground bg-foreground text-background"
                              : "border-border text-foreground/80 hover:border-foreground/40"
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={customization[key]}
                            onChange={(e) =>
                              setCustomization({
                                ...customization,
                                [key]: e.target.checked,
                              })
                            }
                            className="sr-only"
                          />
                          {customization[key] && <Check className="h-3.5 w-3.5" />}
                          {label}
                        </label>
                      ))}
                    </div>
                  </fieldset>

                  <div>
                    <label className="field-label">Extra Requirements</label>
                    <textarea
                      rows={2}
                      value={customization.extraServices}
                      onChange={(e) =>
                        setCustomization({
                          ...customization,
                          extraServices: e.target.value,
                        })
                      }
                      placeholder="Any additional services or requirements..."
                      className="field resize-none"
                    />
                  </div>

                  <div>
                    <label className="field-label">Your Price Offer (Optional)</label>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                        Rs
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={bookingData.offeredPrice}
                        onChange={(e) =>
                          setBookingData({
                            ...bookingData,
                            offeredPrice: e.target.value,
                          })
                        }
                        placeholder={`Listed price: ${venue?.pricePerDay}`}
                        className="field pl-11"
                      />
                    </div>
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      Suggest your own price. The vendor may accept, reject, or
                      counter-offer.
                    </p>
                  </div>

                  <div>
                    <label className="field-label">Message to Vendor</label>
                    <textarea
                      rows={3}
                      value={bookingData.message}
                      onChange={(e) =>
                        setBookingData({
                          ...bookingData,
                          message: e.target.value,
                        })
                      }
                      placeholder="Tell the vendor about your event..."
                      className="field resize-none"
                    />
                  </div>

                  <div className="rounded-xl bg-muted p-4 text-sm text-muted-foreground">
                    <strong className="text-foreground">Note:</strong> This is a booking
                    request. The vendor will review your customization requirements
                    and may negotiate the final price based on your needs.
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setShowBookingForm(false);
                        setSelectedDate("");
                      }}
                      className="btn-ghost flex-1"
                    >
                      Cancel
                    </button>
                    <button type="submit" disabled={bookingLoading} className="btn-accent flex-1">
                      {bookingLoading ? "Booking..." : "Book Now"}
                    </button>
                  </div>
                </form>
              )}

              {venue.vendor && (
                <div className="mt-8 flex items-center gap-4 border-t border-border pt-6">
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-foreground font-mono text-xs uppercase text-background">
                    {venue.vendor.name.slice(0, 2)}
                  </span>
                  <div className="min-w-0">
                    <p className="eyebrow">Managed by</p>
                    <p className="truncate text-sm font-medium text-foreground">
                      {venue.vendor.name}
                    </p>
                    <p className="truncate text-sm text-muted-foreground">
                      {venue.vendor.email}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
