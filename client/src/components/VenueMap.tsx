"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Venue } from "@/types";

interface VenueMapProps {
  venues: Venue[];
  onMarkerClick?: (venueId: number) => void;
  highlightedVenueId?: number;
}

export default function VenueMap({
  venues,
  onMarkerClick,
  highlightedVenueId,
}: VenueMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<{ [key: number]: mapboxgl.Marker }>({});
  const [mapError, setMapError] = useState<string | null>(null);

  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

    if (!token) {
      setMapError(
        "Mapbox token not configured. Add NEXT_PUBLIC_MAPBOX_TOKEN to your .env file."
      );
      return;
    }

    if (!mapContainer.current) return;

    mapboxgl.accessToken = token;

    try {
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: "mapbox://styles/mapbox/light-v11",
        center: [67.0011, 24.8607], // Karachi, Pakistan
        zoom: 11,
      });

      map.current.addControl(new mapboxgl.NavigationControl(), "top-right");

      map.current.addControl(
        new mapboxgl.GeolocateControl({
          positionOptions: {
            enableHighAccuracy: true,
          },
          trackUserLocation: true,
        }),
        "top-right"
      );

      return () => {
        map.current?.remove();
      };
    } catch (error) {
      console.error("Error initializing map:", error);
      setMapError("Error loading map. Please check your Mapbox token.");
    }
  }, []);

  useEffect(() => {
    if (!map.current) return;

    Object.values(markers.current).forEach((marker) => marker.remove());
    markers.current = {};

    if (venues.length === 0) return;

    const bounds = new mapboxgl.LngLatBounds();

    venues.forEach((venue) => {
      // Extract coordinates dynamically from venue data
      let lng: number | undefined;
      let lat: number | undefined;

      // Check if venue has coordinates data (from PostGIS or lat/lng fields)
      if ((venue as any).coordinates) {
        // Parse PostGIS POINT format: "POINT(lng lat)"
        const coords = (venue as any).coordinates;
        if (typeof coords === "string") {
          const matches = coords.match(/POINT\(([^ ]+) ([^ ]+)\)/);
          if (matches) {
            lng = parseFloat(matches[1]);
            lat = parseFloat(matches[2]);
          }
        } else if (coords.x !== undefined && coords.y !== undefined) {
          lng = coords.x;
          lat = coords.y;
        }
      } else if ((venue as any).longitude && (venue as any).latitude) {
        lng = (venue as any).longitude;
        lat = (venue as any).latitude;
      }

      // Fallback to city-based coordinates if no specific coordinates available
      if (lng === undefined || lat === undefined) {
        const cityCoords: { [key: string]: [number, number] } = {
          Karachi: [67.0011, 24.8607],
          Lahore: [74.3436, 31.5204],
          Islamabad: [73.0479, 33.6844],
          Faisalabad: [73.0911, 31.417],
          Rawalpindi: [73.0169, 33.5651],
          Multan: [71.5249, 30.1575],
          Peshawar: [71.5249, 34.0151],
          Quetta: [67.0011, 30.1798],
        };

        const coords = cityCoords[venue.location.city] || cityCoords["Karachi"];
        lng = coords[0];
        lat = coords[1];
      }

      bounds.extend([lng, lat]);

      const el = document.createElement("div");
      el.className = "marker";
      el.style.cursor = "pointer";
      el.style.borderRadius = "50%";
      el.style.boxShadow = "0 6px 16px -4px rgba(0,0,0,0.35)";

      // Size (not transform) marks the highlight: Mapbox positions markers
      // with the element's own transform.
      const isHighlighted = highlightedVenueId === venue.id;
      el.style.width = isHighlighted ? "34px" : "22px";
      el.style.height = isHighlighted ? "34px" : "22px";
      el.style.backgroundColor = isHighlighted ? "#C2FF1F" : "#0E3B10";
      el.style.border = isHighlighted ? "4px solid #0E3B10" : "3px solid #C2FF1F";

      // Create popup with proper styling
      const popup = new mapboxgl.Popup({
        offset: 25,
        closeButton: false,
        className: "venue-popup",
      }).setHTML(`
        <div style="padding: 14px 16px; min-width: 200px; font-family: var(--font-sans);">
          <h3 style="font-family: var(--font-display); font-size: 1.35rem; line-height: 1.1; color: #0E3B10; text-transform: uppercase; margin-bottom: 6px;">${
            venue.name
          }</h3>
          <p style="font-family: var(--font-mono); font-size: 0.65rem; letter-spacing: 0.14em; text-transform: uppercase; color: #6b6259; margin-bottom: 8px;">${venue.venueType
            .replace(/([A-Z])/g, " $1")
            .trim()}</p>
          <p style="font-size: 0.9rem; color: #0E3B10; background: #C2FF1F; display: inline-block; padding: 2px 8px; border-radius: 8px; font-weight: 600; margin-bottom: 2px;">Rs ${
            venue.pricePerDay
          }/day</p>
          <p style="font-size: 0.75rem; color: #8a8178;">Capacity: ${
            venue.capacity
          }</p>
        </div>
      `);

      // Create marker
      const marker = new mapboxgl.Marker(el)
        .setLngLat([lng, lat])
        .setPopup(popup)
        .addTo(map.current!);

      // Show popup on hover
      el.addEventListener("mouseenter", () => {
        marker.togglePopup();
      });

      el.addEventListener("mouseleave", () => {
        marker.togglePopup();
      });

      // Add click handler
      el.addEventListener("click", () => {
        onMarkerClick?.(venue.id);
      });

      markers.current[venue.id] = marker;
    });

    // Fit map to show all markers
    if (venues.length > 0) {
      map.current.fitBounds(bounds, {
        padding: 50,
        maxZoom: 15,
      });
    }
  }, [venues, highlightedVenueId, onMarkerClick]);

  if (mapError) {
    return (
      <div className="h-full flex items-center justify-center bg-muted p-8 text-center">
        <div>
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
              d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
            />
          </svg>
          <p className="text-muted-foreground mb-2">{mapError}</p>
          <a
            href="https://www.mapbox.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:text-primary/80 text-sm"
          >
            Get a free Mapbox token →
          </a>
        </div>
      </div>
    );
  }

  return <div ref={mapContainer} data-lenis-prevent className="h-full w-full" />;
}
