import prisma from "../../../shared/config/prisma.js";

import type {
  CreateProviderProfileInput,
  UpdateProviderProfileInput,
} from "../validations/provider.validation.js";

export class ProviderService {
  static async createProfile(
    userId: string,
    data: CreateProviderProfileInput
  ) {
    const existingProfile =
      await prisma.providerProfile.findUnique({
        where: {
          userId,
        },
      });

    if (existingProfile) {
      throw new Error(
        "Provider profile already exists"
      );
    }

    return await prisma.providerProfile.create({
      data: {
        userId,
        providerType: data.providerType,
        companyName: data.companyName??null,
        description: data.description??null,
      },
    });
  }

  static async getMyProfile(
    userId: string
  ) {
    const provider =
      await prisma.providerProfile.findUnique({
        where: {
          userId,
        },
         include: {
      user: {
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
          role: true,
          address: true,
          city: true,
          state: true,
          pincode: true,
          profileImage: true,
        },
      },
    },
      });

    if (!provider) {
      throw new Error(
        "Provider profile not found"
      );
    }

    return provider;
  }

  static async updateProfile(
    userId: string,
    data: UpdateProviderProfileInput
  ) {
    const provider =
      await prisma.providerProfile.findUnique({
        where: {
          userId,
        },
      });

    if (!provider) {
      throw new Error(
        "Provider profile not found"
      );
    }

    return await prisma.providerProfile.update({
      where: {
        userId,
      },
      data: {
        ...(data.providerType !== undefined && {
          providerType: data.providerType,
        }),

        ...(data.companyName !== undefined && {
          companyName: data.companyName,
        }),

        ...(data.description !== undefined && {
          description: data.description,
        }),
      },
    });
  }
}