export interface PricingContext {
  skillId: string;
  latitude: number;
  longitude: number;
  durationHours: number;
  workerLatitude?: number | undefined;
  workerLongitude?: number | undefined;
}

export interface IPricingStrategy {
  calculate(context: PricingContext): Promise<number>;
}
export interface IFareCalculator {
  calculate(context: PricingContext): Promise<{ estimatedFare: number }>;
}

export interface ISkillRepository {
  findById(id: string): Promise<{ id: string; name: string; baseRate: any; rateUnit: string } | null>;
}

export interface RouteResult {
  distanceKm: number;
  durationMinutes: number;
}

export interface IMapsProvider {
  getDistanceKm(
    origin: { lat: number; lng: number },
    destination: { lat: number; lng: number },
  ): Promise<number>;

  /**
   * Real road-based distance and travel time (via Mapbox Directions), for anything shown
   * to a user — e.g. "2.3 km, 7 min away". Unlike getDistanceKm (straight-line, used for
   * pricing), this reflects actual roads and traffic-free driving time.
   */
  getRoute(
    origin: { lat: number; lng: number },
    destination: { lat: number; lng: number },
  ): Promise<RouteResult>;
}
