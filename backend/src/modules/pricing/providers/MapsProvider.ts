import type { IMapsProvider, RouteResult } from '../interfaces/IPricingStrategy.js';
import { Logger } from '../../../core/logger/Logger.js';
import { env } from '../../../config/env.js';

// Assumed average urban driving speed, used only as a fallback estimate when the Directions
// API is unavailable (no token configured, or the request fails) — not meant to be precise.
const FALLBACK_AVG_SPEED_KMH = 25;

export class MapsProvider implements IMapsProvider {
  private readonly logger = new Logger('MapsProvider');

  async getDistanceKm(
    origin: { lat: number; lng: number },
    destination: { lat: number; lng: number },
  ): Promise<number> {
    try {
      const R = 6371; // Earth radius in km
      const dLat = this.toRad(destination.lat - origin.lat);
      const dLon = this.toRad(destination.lng - origin.lng);
      
      const lat1 = this.toRad(origin.lat);
      const lat2 = this.toRad(destination.lat);

      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
        
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const distance = R * c;

      this.logger.debug(`Calculated geodistance: ${distance.toFixed(2)} km`, { origin, destination });
      return distance;
    } catch (err) {
      this.logger.error('Failed to compute geodistance. Falling back to default (5km)', err);
      return 5; // Default fallback
    }
  }

  private toRad(value: number): number {
    return (value * Math.PI) / 180;
  }

  async getRoute(
    origin: { lat: number; lng: number },
    destination: { lat: number; lng: number },
  ): Promise<RouteResult> {
    if (env.MAPBOX_ACCESS_TOKEN) {
      try {
        const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?access_token=${env.MAPBOX_ACCESS_TOKEN}&overview=false`;
        const res = await fetch(url);
        const data: any = await res.json();
        const route = data?.routes?.[0];

        if (route) {
          return {
            distanceKm: route.distance / 1000,
            durationMinutes: route.duration / 60,
          };
        }
        this.logger.warn('Mapbox Directions returned no route, falling back to straight-line estimate', { origin, destination });
      } catch (err) {
        this.logger.error('Mapbox Directions request failed, falling back to straight-line estimate', err);
      }
    }

    const distanceKm = await this.getDistanceKm(origin, destination);
    return {
      distanceKm,
      durationMinutes: (distanceKm / FALLBACK_AVG_SPEED_KMH) * 60,
    };
  }
}
