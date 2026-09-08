import { useEffect, useState } from "react";

declare global {
  interface Window {
    google?: any;
    googleMapsLoaded?: boolean;
    googleMapsCallback?: () => void;
  }
}

export function useGoogleMapsScript() {
  return false;
}
