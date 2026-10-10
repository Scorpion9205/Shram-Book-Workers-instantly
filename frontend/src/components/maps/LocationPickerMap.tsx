"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { EmptyState } from "@/components/cards/EmptyState";
import { MapPin } from "lucide-react";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || "";

interface LocationPickerMapProps {
  lat: number;
  lng: number;
  onPositionChange: (lat: number, lng: number) => void;
}

/**
 * An interactive Mapbox map with a single draggable pin, used to let the user visually confirm
 * (and fine-tune) a selected address — the same "drag the pin" pattern Uber/Ola use for pickup
 * locations. Dragging the marker calls onPositionChange with the new coordinates.
 */
export function LocationPickerMap({ lat, lng, onPositionChange }: LocationPickerMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const isDraggingRef = useRef(false);
  const onPositionChangeRef = useRef(onPositionChange);
  onPositionChangeRef.current = onPositionChange;

  // Create the map + marker once.
  useEffect(() => {
    if (!MAPBOX_TOKEN || !containerRef.current || mapRef.current) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;

    mapRef.current = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [lng, lat],
      zoom: 15,
    });
    mapRef.current.addControl(new mapboxgl.NavigationControl(), "top-right");

    markerRef.current = new mapboxgl.Marker({ color: "#10B981", draggable: true })
      .setLngLat([lng, lat])
      .addTo(mapRef.current);

    markerRef.current.on("dragstart", () => {
      isDraggingRef.current = true;
    });
    markerRef.current.on("dragend", () => {
      isDraggingRef.current = false;
      const pos = markerRef.current!.getLngLat();
      onPositionChangeRef.current(pos.lat, pos.lng);
    });

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Recenter when the selected location changes externally (e.g. a new search result) — but
  // skip this while the user is actively dragging the pin, otherwise the map fights their drag.
  useEffect(() => {
    if (!mapRef.current || !markerRef.current || isDraggingRef.current) return;
    markerRef.current.setLngLat([lng, lat]);
    mapRef.current.panTo([lng, lat]);
  }, [lat, lng]);

  if (!MAPBOX_TOKEN) {
    return (
      <EmptyState icon={MapPin} title="Map not configured" description="A Mapbox access token is required to show the map." />
    );
  }

  return (
    <div className="space-y-1.5">
      <div ref={containerRef} className="h-56 w-full overflow-hidden rounded-2xl border border-border" />
      <p className="text-center text-xs text-muted-foreground">Drag the pin to fine-tune the exact location.</p>
    </div>
  );
}
