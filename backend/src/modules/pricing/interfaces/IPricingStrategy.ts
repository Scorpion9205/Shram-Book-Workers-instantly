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
