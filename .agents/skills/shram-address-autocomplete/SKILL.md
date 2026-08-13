---
name: shram-address-autocomplete
description: >-
  Use this skill when implementing address input in SHRAM frontend: Google
  Places Autocomplete search bar (Uber/Urban Company style), place detail
  resolution to lat/lng, the AddressSearch component, map pin confirmation,
  and reverse geocoding for current location. Activate when: user asks about
  address input, location picker, Google Maps autocomplete, or how to get
  coordinates from an address.
---

# SHRAM — Address Autocomplete (Uber/Urban Company Style)

## UX Pattern

No free-text address fields. No manual pin-drop as the primary input.

```
User types in search bar → Places Autocomplete suggestions appear
                                ↓
            User selects a suggestion
                                ↓
        Place Details API → resolves { lat, lng, formattedAddress, placeId }
                                ↓
          (Optional) Small map shows pin for confirmation
                                ↓
           Address stored as { placeId, lat, lng, formattedAddress }
```

Current location button → Geolocation API → Reverse Geocoding → fill search bar.

## AddressSearch Component

```typescript
// components/common/AddressSearch.tsx
'use client';

import { useState, useRef, useCallback } from 'react';
import { useGoogleMapsScript } from '@/hooks/useGoogleMapsScript.js';

export interface PlaceResult {
  placeId: string;
  formattedAddress: string;
  latitude: number;
  longitude: number;
}

interface AddressSearchProps {
  onSelect: (place: PlaceResult) => void;
  placeholder?: string;
  defaultValue?: string;
  className?: string;
}

export function AddressSearch({ onSelect, placeholder = 'Search for location...', defaultValue, className }: AddressSearchProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [value, setValue] = useState(defaultValue ?? '');
  const { isLoaded } = useGoogleMapsScript();

  const initAutocomplete = useCallback(() => {
    if (!inputRef.current || !window.google) return;

    autocompleteRef.current = new google.maps.places.Autocomplete(inputRef.current, {
      fields: ['place_id', 'geometry', 'formatted_address'],
      componentRestrictions: { country: 'in' }, // India only
      types: ['geocode', 'establishment'],
    });

    autocompleteRef.current.addListener('place_changed', () => {
      const place = autocompleteRef.current!.getPlace();
      if (!place.geometry?.location || !place.place_id) return;

      const result: PlaceResult = {
        placeId: place.place_id,
        formattedAddress: place.formatted_address ?? '',
        latitude: place.geometry.location.lat(),
        longitude: place.geometry.location.lng(),
      };

      setValue(result.formattedAddress);
      onSelect(result);
    });
  }, [onSelect]);

  // Initialize when Google Maps is loaded
  useEffect(() => {
    if (isLoaded) initAutocomplete();
  }, [isLoaded, initAutocomplete]);

  const handleCurrentLocation = async () => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(async (pos) => {
      const { latitude, longitude } = pos.coords;
      const address = await reverseGeocode(latitude, longitude);
      if (address) {
        setValue(address.formattedAddress);
        onSelect(address);
        // Update input display
        if (inputRef.current) inputRef.current.value = address.formattedAddress;
      }
    });
  };

  return (
    <div className="address-search-container">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className={className}
        autoComplete="off"
      />
      <button
        type="button"
        onClick={handleCurrentLocation}
        title="Use current location"
      >
        📍
      </button>
    </div>
  );
}
```

## Reverse Geocoding Helper

```typescript
// features/location/utils/geocoding.utils.ts
export async function reverseGeocode(lat: number, lng: number): Promise<PlaceResult | null> {
  if (!window.google) return null;

  const geocoder = new google.maps.Geocoder();
  const result = await geocoder.geocode({ location: { lat, lng } });

  if (!result.results.length) return null;

  const place = result.results[0];
  return {
    placeId: place.place_id,
    formattedAddress: place.formatted_address,
    latitude: lat,
    longitude: lng,
  };
}
```

## Google Maps Script Hook

```typescript
// hooks/useGoogleMapsScript.ts
import { useEffect, useState } from 'react';

const SCRIPT_ID = 'google-maps-script';

export function useGoogleMapsScript() {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (window.google?.maps) {
      setIsLoaded(true);
      return;
    }

    if (document.getElementById(SCRIPT_ID)) return;

    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => setIsLoaded(true);
    document.head.appendChild(script);
  }, []);

  return { isLoaded };
}
```

## Usage in Forms (React Hook Form)

```typescript
// In CreateJobForm.tsx
import { AddressSearch, type PlaceResult } from '@/components/common/AddressSearch.js';

const form = useForm<CreateJobFormData>({ resolver: zodResolver(createJobSchema) });

const handleAddressSelect = (place: PlaceResult) => {
  form.setValue('address', {
    placeId: place.placeId,
    formattedAddress: place.formattedAddress,
    latitude: place.latitude,
    longitude: place.longitude,
  });
};

// In JSX
<AddressSearch
  onSelect={handleAddressSelect}
  placeholder="Where do you need the worker?"
  defaultValue={form.watch('address.formattedAddress')}
/>
{form.formState.errors.address && (
  <span className="error">{form.formState.errors.address.message}</span>
)}
```

## Address Type (shared across features)

```typescript
// lib/types/location.types.ts
export interface Address {
  placeId: string;
  formattedAddress: string;
  latitude: number;
  longitude: number;
}

// This is what gets stored in Booking.address (JSON field in Prisma)
// Never store just a string address — always store lat/lng for distance calculations
```

## Next.js Config for Google Maps

```typescript
// next.config.ts — allow Google domains for maps
const config = {
  images: {
    domains: ['maps.googleapis.com', 'maps.gstatic.com'],
  },
};
```
