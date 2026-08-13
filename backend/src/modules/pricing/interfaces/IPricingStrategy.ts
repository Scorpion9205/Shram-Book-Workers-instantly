export interface PricingContext {
  skillId: string;
  latitude: number;
  longitude: number;
  durationHours: number;
  workerLatitude?: number;
  workerLongitude?: number;
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

export interface IMapsProvider {
  getDistanceKm(
    origin: { lat: number; lng: number },
    destination: { lat: number; lng: number },
  ): Promise<number>;
}
