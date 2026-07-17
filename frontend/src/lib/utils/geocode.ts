export interface Coordinates {
  latitude: number;
  longitude: number;
}

export async function geocodeAddress(address: string): Promise<Coordinates | null> {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!apiKey || !address.trim()) {
    return null;
  }

  const params = new URLSearchParams({
    address,
    key: apiKey,
  });

  const response = await fetch(
    `https://maps.googleapis.com/maps/api/geocode/json?${params.toString()}`
  );

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as {
    status: string;
    results?: Array<{
      geometry?: {
        location?: {
          lat: number;
          lng: number;
        };
      };
    }>;
  };

  const location = data.results?.[0]?.geometry?.location;

  if (data.status !== "OK" || !location) {
    return null;
  }

  return {
    latitude: location.lat,
    longitude: location.lng,
  };
}
