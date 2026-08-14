import { useEffect, useState } from "react";

declare global {
  interface Window {
    google?: any;
    googleMapsLoaded?: boolean;
    googleMapsCallback?: () => void;
  }
}

export function useGoogleMapsScript() {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (window.google?.maps) {
      setLoaded(true);
      return;
    }

    if (window.googleMapsLoaded) {
      setLoaded(true);
      return;
    }

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
    if (!apiKey) {
      console.warn("Google Maps API Key not configured.");
      setLoaded(true); // Fall back to avoid locking UI
      return;
    }

    // Check if script already exists in document
    const existingScript = document.getElementById("google-maps-script");
    if (existingScript) {
      const checkLoaded = setInterval(() => {
        if (window.google?.maps) {
          setLoaded(true);
          clearInterval(checkLoaded);
        }
      }, 100);
      return () => clearInterval(checkLoaded);
    }

    window.googleMapsCallback = () => {
      window.googleMapsLoaded = true;
      setLoaded(true);
      delete window.googleMapsCallback;
    };

    const script = document.createElement("script");
    script.id = "google-maps-script";
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=googleMapsCallback`;
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);

    return () => {
      // Keep script attached to prevent reload, just clean callback
    };
  }, []);

  return loaded;
}
