import type { IMapsProvider } from '../interfaces/IPricingStrategy.js';
import { Logger } from '../../../core/logger/Logger.js';

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
}
