"use client";

import { useEffect, useRef, useState } from "react";
import { MapPin, Navigation } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useGoogleMapsScript } from "@/hooks/useGoogleMapsScript";
import { toast } from "sonner";

export interface AddressDetails {
  address: string;
  lat: number;
  lng: number;
  placeId: string;
}

interface AddressSearchProps {
  value?: string;
  onChange: (details: AddressDetails) => void;
  placeholder?: string;
}

export function AddressSearch({ value = "", onChange, placeholder = "Search address..." }: AddressSearchProps) {
  const isMapsLoaded = useGoogleMapsScript();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [inputValue, setInputValue] = useState(value);
  const [isDetecting, setIsDetecting] = useState(false);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  useEffect(() => {
    if (!isMapsLoaded || !inputRef.current || !window.google?.maps?.places) return;

    const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
      componentRestrictions: { country: "in" },
      fields: ["formatted_address", "geometry", "place_id"],
    });

    autocomplete.addListener("place_changed", () => {
      const place = autocomplete.getPlace();
      if (!place.geometry || !place.geometry.location) {
        toast.error("Please select a valid address from the dropdown list.");
        return;
      }

      const details: AddressDetails = {
        address: place.formatted_address || "",
        lat: place.geometry.location.lat(),
        lng: place.geometry.location.lng(),
        placeId: place.place_id || "",
      };

      setInputValue(details.address);
      onChange(details);
    });

    return () => {
      window.google?.maps?.event?.clearInstanceListeners(autocomplete);
    };
  }, [isMapsLoaded, onChange]);

  const handleUseCurrentLocation = () => {
    if (!("geolocation" in navigator)) {
      toast.error("Geolocation is not supported by your browser.");
      return;
    }

    setIsDetecting(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        
        if (!window.google?.maps) {
          // Fallback if maps fails to load
          const details: AddressDetails = {
            address: `Location (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`,
            lat: latitude,
            lng: longitude,
            placeId: "current_location",
          };
          setInputValue(details.address);
          onChange(details);
          setIsDetecting(false);
          return;
        }

        const geocoder = new window.google.maps.Geocoder();
        geocoder.geocode(
          { location: { lat: latitude, lng: longitude } },
          (results: any, status: any) => {
            setIsDetecting(false);
            if (status === "OK" && results && results[0]) {
              const details: AddressDetails = {
                address: results[0].formatted_address,
                lat: latitude,
                lng: longitude,
                placeId: results[0].place_id,
              };
              setInputValue(details.address);
              onChange(details);
            } else {
              toast.error("Failed to reverse geocode current coordinates.");
            }
          }
        );
      },
      (error) => {
        setIsDetecting(false);
        toast.error("Please allow location access to fetch coordinates.");
      },
      { enableHighAccuracy: true }
    );
  };

  return (
    <div className="relative space-y-2">
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => {
            const val = e.target.value;
            setInputValue(val);
            onChange({
              address: val,
              lat: 0,
              lng: 0,
              placeId: "manual_input",
            });
          }}
          placeholder={placeholder}
          className="pl-9 pr-24"
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="absolute right-1 top-1/2 h-8 -translate-y-1/2 text-xs font-semibold text-primary hover:bg-primary/5"
          onClick={handleUseCurrentLocation}
          loading={isDetecting}
        >
          <Navigation className="size-3 mr-1" />
          Locate Me
        </Button>
      </div>
    </div>
  );
}
