"use client";

import { useState } from "react";

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

interface VenueFiltersProps {
  onFilterChange: (filters: FilterValues) => void;
}

const VENUE_TYPES = [
  "All Types",
  "ConferenceCenter",
  "BanquetHall",
  "OutdoorSpace",
  "Hotel",
  "Restaurant",
  "Theater",
  "Gallery",
  "Rooftop",
];

export default function VenueFilters({ onFilterChange }: VenueFiltersProps) {
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

  const handleChange = (field: keyof FilterValues, value: string) => {
    const newFilters = { ...filters, [field]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const handleReset = () => {
    const resetFilters: FilterValues = {
      venueType: "",
      minPrice: "",
      maxPrice: "",
      minCapacity: "",
      maxCapacity: "",
      city: "",
      sortBy: "postedDate",
      sortOrder: "desc",
    };
    setFilters(resetFilters);
    onFilterChange(resetFilters);
  };

  const label = (type: string) => type.replace(/([A-Z])/g, " $1").trim();

  return (
    <div className="rounded-[1.75rem] border-[3px] border-forest bg-card shadow-sticker dark:border-lime p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <span className="eyebrow">Refine</span>
          <h2 className="mt-1 font-display text-3xl leading-none text-foreground">Filters</h2>
        </div>
        <button
          onClick={handleReset}
          className="link-underline text-xs uppercase tracking-[0.14em] text-muted-foreground hover:text-foreground"
        >
          Reset All
        </button>
      </div>

      {/* Venue Type */}
      <fieldset className="mb-6">
        <legend className="field-label">Venue Type</legend>
        <div className="flex flex-wrap gap-1.5">
          {VENUE_TYPES.map((type) => {
            const value = type === "All Types" ? "" : type;
            const active = filters.venueType === value;
            return (
              <button
                key={type}
                type="button"
                onClick={() => handleChange("venueType", value)}
                aria-pressed={active}
                className={`rounded-full border px-3 py-1.5 text-xs transition-colors duration-300 ${
                  active
                    ? "border-foreground bg-foreground text-background"
                    : "border-border text-foreground/75 hover:border-foreground/40 hover:text-foreground"
                }`}
              >
                {label(type)}
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="mb-5">
        <label className="field-label">Price Range (per day)</label>
        <div className="flex gap-2">
          <input
            type="number"
            placeholder="Min (Rs)"
            value={filters.minPrice}
            onChange={(e) => handleChange("minPrice", e.target.value)}
            className="field w-1/2 bg-background px-3 py-2.5"
          />
          <input
            type="number"
            placeholder="Max (Rs)"
            value={filters.maxPrice}
            onChange={(e) => handleChange("maxPrice", e.target.value)}
            className="field w-1/2 bg-background px-3 py-2.5"
          />
        </div>
      </div>

      <div className="mb-5">
        <label className="field-label">Capacity</label>
        <div className="flex gap-2">
          <input
            type="number"
            placeholder="Min"
            value={filters.minCapacity}
            onChange={(e) => handleChange("minCapacity", e.target.value)}
            className="field w-1/2 bg-background px-3 py-2.5"
          />
          <input
            type="number"
            placeholder="Max"
            value={filters.maxCapacity}
            onChange={(e) => handleChange("maxCapacity", e.target.value)}
            className="field w-1/2 bg-background px-3 py-2.5"
          />
        </div>
      </div>

      <div className="mb-5">
        <label className="field-label">City</label>
        <input
          type="text"
          placeholder="e.g., Karachi, Lahore"
          value={filters.city}
          onChange={(e) => handleChange("city", e.target.value)}
          className="field bg-background px-3 py-2.5"
        />
      </div>

      {/* Sort By */}
      <div className="mb-5">
        <label className="field-label">Sort By</label>
        <select
          value={filters.sortBy}
          onChange={(e) => handleChange("sortBy", e.target.value)}
          className="field bg-background px-3 py-2.5"
        >
          <option value="postedDate">Recently Added</option>
          <option value="pricePerDay">Price (per day)</option>
          <option value="capacity">Capacity</option>
          <option value="views">Most Viewed</option>
          <option value="rating">Rating</option>
        </select>
      </div>

      <fieldset>
        <legend className="field-label">Order</legend>
        <div className="grid grid-cols-2 rounded-full border border-border bg-background p-1">
          {[
            { value: "asc", text: "Ascending" },
            { value: "desc", text: "Descending" },
          ].map((o) => (
            <label
              key={o.value}
              className={`cursor-pointer rounded-full py-2 text-center text-xs transition-colors duration-300 ${
                filters.sortOrder === o.value
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <input
                type="radio"
                value={o.value}
                checked={filters.sortOrder === o.value}
                onChange={(e) => handleChange("sortOrder", e.target.value)}
                className="sr-only"
              />
              {o.text}
            </label>
          ))}
        </div>
      </fieldset>
    </div>
  );
}
