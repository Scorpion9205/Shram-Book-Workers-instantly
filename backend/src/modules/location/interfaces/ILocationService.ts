import type { UpdateLocationInput } from "../validations/location.validation.js";

export interface ILocationService {
  updateLocation(userId: string, data: UpdateLocationInput): Promise<{ userId: string; latitude: number; longitude: number }>;
  getMyLocation(userId: string): Promise<{ userId: string; latitude: number; longitude: number }>;
}
