import type { UpdateLocationInput } from "../validations/location.validation.js";
export declare class LocationService {
    static updateLocation(userId: string, data: UpdateLocationInput): Promise<{
        id: string;
        userId: string;
        createdAt: Date;
        updatedAt: Date;
        latitude: number;
        longitude: number;
    }>;
    static getMyLocation(userId: string): Promise<{
        id: string;
        userId: string;
        createdAt: Date;
        updatedAt: Date;
        latitude: number;
        longitude: number;
    }>;
}
//# sourceMappingURL=location.services.d.ts.map