"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { EmptyState } from "@/components/cards/EmptyState";
import { MapPin } from "lucide-react";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || "";

interface LiveTrackingMapProps {
  workerPosition: { latitude: number; longitude: number } | null;
  destination?: { lat: number; lng: number };
}

/**
 * Renders a live-updating Mapbox map with the Worker's current position and (optionally) the
 * job's destination. The map instance and markers are created once and then just moved —
 * recreating the whole map on every position update would flash/reset the user's zoom & pan.
 */
export function LiveTrackingMap({ workerPosition, destination }: LiveTrackingMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const workerMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const destinationMarkerRef = useRef<mapboxgl.Marker | null>(null);

  // Create the map + markers once.
  useEffect(() => {
    if (!MAPBOX_TOKEN || !containerRef.current || mapRef.current) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;

    const center: [number, number] = workerPosition
      ? [workerPosition.longitude, workerPosition.latitude]
      : destination
        ? [destination.lng, destination.lat]
        : [78.9629, 20.5937]; // fallback: center of India

    mapRef.current = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center,
      zoom: 13,
    });
    mapRef.current.addControl(new mapboxgl.NavigationControl(), "top-right");

    if (destination) {
      destinationMarkerRef.current = new mapboxgl.Marker({ color: "#4F46E5" })
        .setLngLat([destination.lng, destination.lat])
        .addTo(mapRef.current);
    }

    if (workerPosition) {
      workerMarkerRef.current = new mapboxgl.Marker({ color: "#10B981" })
        .setLngLat([workerPosition.longitude, workerPosition.latitude])
        .addTo(mapRef.current);
    }

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
      workerMarkerRef.current = null;
      destinationMarkerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Move the worker marker (and re-fit bounds) whenever a new position comes in.
  useEffect(() => {
    if (!mapRef.current || !workerPosition) return;

    const lngLat: [number, number] = [workerPosition.longitude, workerPosition.latitude];

    if (!workerMarkerRef.current) {
      workerMarkerRef.current = new mapboxgl.Marker({ color: "#10B981" }).setLngLat(lngLat).addTo(mapRef.current);
    } else {
      workerMarkerRef.current.setLngLat(lngLat);
    }

    if (destination) {
      const bounds = new mapboxgl.LngLatBounds();
      bounds.extend(lngLat);
      bounds.extend([destination.lng, destination.lat]);
      mapRef.current.fitBounds(bounds, { padding: 48, maxZoom: 15 });
    } else {
      mapRef.current.panTo(lngLat);
    }
  }, [workerPosition, destination]);

  if (!MAPBOX_TOKEN) {
    return (
      <EmptyState
        icon={MapPin}
        title="Map not configured"
        description="A Mapbox access token is required to show live tracking."
      />
    );
  }

  if (!workerPosition) {
    return (
      <EmptyState
        icon={MapPin}
        title="Waiting for live location"
        description="The map will appear as soon as the worker's location comes in."
      />
    );
  }

  return <div ref={containerRef} className="h-64 w-full overflow-hidden rounded-2xl" />;
}
