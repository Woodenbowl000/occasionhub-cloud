"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/app/(auth)/authProvider";
import { Calendar } from "@/components/ui/calendar";
import api from "@/lib/api";

interface AvailabilityCalendarProps {
  venueId: string;
  onDateSelect?: (date: Date | undefined) => void;
}

export default function AvailabilityCalendar({
  venueId,
  onDateSelect,
}: AvailabilityCalendarProps) {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [bookedDates, setBookedDates] = useState<Date[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBookedDates();
  }, [venueId]);

  const fetchBookedDates = async () => {
    try {
      const response = await api.get(`/venues/${venueId}/booked-dates`);
      const dates = response.data.bookedDates.map(
        (dateStr: string) => new Date(dateStr + "T00:00:00")
      );
      setBookedDates(dates);
    } catch (error) {
      console.error("Failed to fetch booked dates:", error);
    } finally {
      setLoading(false);
    }
  };

  const isDateBooked = (date: Date) => {
    return bookedDates.some(
      (bookedDate) =>
        bookedDate.getFullYear() === date.getFullYear() &&
        bookedDate.getMonth() === date.getMonth() &&
        bookedDate.getDate() === date.getDate()
    );
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (authLoading) {
      return;
    }

    if (!isAuthenticated) {
      window.location.href = `/signin?redirect=/venues/${venueId}`;
      return;
    }

    if (!date) {
      setSelectedDate(undefined);
      if (onDateSelect) {
        onDateSelect(undefined);
      }
      return;
    }

    if (isDateBooked(date)) {
      alert("This date is already booked and confirmed");
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);

    if (checkDate < today) {
      alert("Cannot book past dates");
      return;
    }

    setSelectedDate(date);
    if (onDateSelect) {
      onDateSelect(date);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-background p-4 sm:p-5">
      <h3 className="eyebrow mb-4">
        Select Date
      </h3>

      <style jsx global>{`
        .rdp-day_selected:not([disabled]) {
          background-color: hsl(var(--primary)) !important;
          color: hsl(var(--primary-foreground)) !important;
        }
        .rdp-day_booked {
          background-color: #fee2e2 !important;
          color: #991b1b !important;
          cursor: not-allowed !important;
          position: relative;
          font-weight: 600;
        }
        .rdp-day_booked:hover {
          background-color: #fecaca !important;
        }
        .rdp-day_booked::after {
          content: "";
          position: absolute;
          bottom: 4px;
          left: 50%;
          transform: translateX(-50%);
          width: 5px;
          height: 5px;
          background-color: #dc2626;
          border-radius: 50%;
        }
        .rdp-day:not([disabled]):not(.rdp-day_selected):not(
            .rdp-day_booked
          ):hover {
          background-color: #f0fdf4 !important;
          color: #15803d !important;
        }
      `}</style>

      <Calendar
        mode="single"
        selected={selectedDate}
        onSelect={handleDateSelect}
        disabled={(date) => {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const checkDate = new Date(date);
          checkDate.setHours(0, 0, 0, 0);
          return checkDate < today || isDateBooked(date);
        }}
        modifiers={{
          booked: bookedDates,
        }}
        modifiersClassNames={{
          booked: "rdp-day_booked",
        }}
        className="mx-auto rounded-xl"
        fromDate={new Date()}
      />

      <div className="mt-6 pt-4 border-t border-border">
        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-50 border-2 border-green-300 rounded"></div>
            <span className="text-foreground">Available</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-100 border-2 border-red-300 rounded relative">
              <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-red-600 rounded-full"></div>
            </div>
            <span className="text-foreground">Confirmed & Paid</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-muted rounded"></div>
            <span className="text-foreground">Past</span>
          </div>
        </div>
      </div>

      {selectedDate && !isDateBooked(selectedDate) && (
        <div className="mt-4 rounded-xl border border-primary/40 bg-primary/10 p-4">
          <p className="text-sm text-foreground">
            <strong>Selected Date:</strong>{" "}
            {selectedDate.toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
      )}
    </div>
  );
}
