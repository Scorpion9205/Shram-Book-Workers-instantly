"use client";

import { useEffect, useRef, useState } from "react";
import { MapPin, Navigation } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || "";

export interface AddressDetails {
  address: string;
  lat: number;
  lng: number;
  placeId: string;
}

interface Suggestion {
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
  const [inputValue, setInputValue] = useState(value);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isDetecting, setIsDetecting] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Close the suggestion list on outside click.
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function fetchSuggestions(query: string) {
    if (!MAPBOX_TOKEN) {
      console.warn("Mapbox access token not configured.");
      return;
    }
    if (query.trim().length < 3) {
      setSuggestions([]);
      return;
    }

    setIsSearching(true);
    try {
      const url = `https://api.mapbox.com/search/geocode/v6/forward?q=${encodeURIComponent(query)}&access_token=${MAPBOX_TOKEN}&country=in&limit=5&autocomplete=true`;
      const res = await fetch(url);
      const data = await res.json();

      const results: Suggestion[] = (data.features || []).map((f: any) => ({
        address: f.properties?.full_address || f.properties?.name || "",
        lat: f.geometry?.coordinates?.[1],
        lng: f.geometry?.coordinates?.[0],
        placeId: f.properties?.mapbox_id || "",
      }));
      setSuggestions(results);
      setShowSuggestions(true);
    } catch {
      // Network blip on an autocomplete request isn't worth interrupting the user over —
      // they can keep typing or try "Locate Me" instead.
    } finally {
      setIsSearching(false);
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setInputValue(val);
    onChange({ address: val, lat: 0, lng: 0, placeId: "manual_input" });

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(val), 300);
  }

  function handleSelectSuggestion(suggestion: Suggestion) {
    setInputValue(suggestion.address);
    setShowSuggestions(false);
    setSuggestions([]);
    onChange(suggestion);
  }

  const handleUseCurrentLocation = () => {
    if (!("geolocation" in navigator)) {
      toast.error("Geolocation is not supported by your browser.");
      return;
    }
    if (!MAPBOX_TOKEN) {
      toast.error("Maps is not configured. Please contact support.");
      return;
    }

    setIsDetecting(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const url = `https://api.mapbox.com/search/geocode/v6/reverse?longitude=${longitude}&latitude=${latitude}&access_token=${MAPBOX_TOKEN}`;
          const res = await fetch(url);
          const data = await res.json();
          const feature = data.features?.[0];

          const details: AddressDetails = {
            address: feature?.properties?.full_address || `Location (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`,
            lat: latitude,
            lng: longitude,
            placeId: feature?.properties?.mapbox_id || "current_location",
          };
          setInputValue(details.address);
          onChange(details);
        } catch {
          toast.error("Failed to reverse geocode current coordinates.");
        } finally {
          setIsDetecting(false);
        }
      },
      () => {
        setIsDetecting(false);
        toast.error("Please allow location access to fetch coordinates.");
      },
      { enableHighAccuracy: true }
    );
  };

  return (
    <div className="relative space-y-2" ref={containerRef}>
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
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

      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-20 w-full overflow-hidden rounded-xl border border-border bg-card shadow-lg">
          {suggestions.map((s) => (
            <button
              key={s.placeId || s.address}
              type="button"
              onClick={() => handleSelectSuggestion(s)}
              className="flex w-full items-start gap-2 px-3.5 py-2.5 text-left text-sm hover:bg-secondary"
            >
              <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <span className="truncate">{s.address}</span>
            </button>
          ))}
        </div>
      )}
      {isSearching && !showSuggestions && (
        <p className="text-xs text-muted-foreground">Searching...</p>
      )}
    </div>
  );
}
