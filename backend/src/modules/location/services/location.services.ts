import prisma from "../../../shared/config/prisma.js";
import type { UpdateLocationInput } from "../validations/location.validation.js";

export class LocationService {
  static async updateLocation(
    userId: string,
    data: UpdateLocationInput
  ) {
    const existingLocation =
      await prisma.userLocation.findUnique({
        where: {
          userId,
        },
      });

    if (!existingLocation) {
      return await prisma.userLocation.create({
        data: {
          userId,
          latitude: data.latitude,
          longitude: data.longitude,
        },
      });
    }

    return await prisma.userLocation.update({
      where: {
        userId,
      },
      data: {
        latitude: data.latitude,
        longitude: data.longitude,
      },
    });
  }

  static async getMyLocation(
    userId: string
  ) {
    const location =
      await prisma.userLocation.findUnique({
        where: {
          userId,
        },
      });

    if (!location) {
      throw new Error(
        "Location not found"
      );
    }

    return location;
  }
}