"use client";

import { useEffect, useRef } from "react";
import { useGoogleMapsScript } from "@/hooks/useGoogleMapsScript";
import { EmptyState } from "@/components/cards/EmptyState";
import { MapPin } from "lucide-react";

interface LiveTrackingMapProps {
  workerPosition: { latitude: number; longitude: number } | null;
  destination?: { lat: number; lng: number };
}

/**
 * Renders a live-updating Google Map with the Worker's current position and (optionally) the
 * job's destination. The map instance and markers are created once and then just moved —
 * recreating the whole map on every position update would flash/reset the user's zoom & pan.
 */
export function LiveTrackingMap({ workerPosition, destination }: LiveTrackingMapProps) {
  const isMapsLoaded = useGoogleMapsScript();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const workerMarkerRef = useRef<any>(null);
  const destinationMarkerRef = useRef<any>(null);

  // Create the map + markers once Maps is loaded.
  useEffect(() => {
    if (!isMapsLoaded || !containerRef.current || mapRef.current || !window.google?.maps) return;

    const center = workerPosition
      ? { lat: workerPosition.latitude, lng: workerPosition.longitude }
      : destination ?? { lat: 20.5937, lng: 78.9629 }; // fallback: center of India

    mapRef.current = new window.google.maps.Map(containerRef.current, {
      center,
      zoom: 14,
      disableDefaultUI: true,
      zoomControl: true,
    });

    if (destination) {
      destinationMarkerRef.current = new window.google.maps.Marker({
        position: destination,
        map: mapRef.current,
        title: "Job location",
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: "#4F46E5",
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 2,
        },
      });
    }

    if (workerPosition) {
      workerMarkerRef.current = new window.google.maps.Marker({
        position: { lat: workerPosition.latitude, lng: workerPosition.longitude },
        map: mapRef.current,
        title: "Worker",
        icon: {
          path: window.google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
          scale: 5,
          fillColor: "#10B981",
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 2,
        },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMapsLoaded]);

  // Move the worker marker (and re-fit bounds) whenever a new position comes in.
  useEffect(() => {
    if (!mapRef.current || !workerPosition || !window.google?.maps) return;

    const position = { lat: workerPosition.latitude, lng: workerPosition.longitude };

    if (!workerMarkerRef.current) {
      workerMarkerRef.current = new window.google.maps.Marker({
        position,
        map: mapRef.current,
        title: "Worker",
      });
    } else {
      workerMarkerRef.current.setPosition(position);
    }

    if (destination) {
      const bounds = new window.google.maps.LatLngBounds();
      bounds.extend(position);
      bounds.extend(destination);
      mapRef.current.fitBounds(bounds, 48);
    } else {
      mapRef.current.panTo(position);
    }
  }, [workerPosition, destination]);

  if (!isMapsLoaded) {
    return <div className="h-64 w-full animate-pulse rounded-2xl bg-secondary" />;
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
