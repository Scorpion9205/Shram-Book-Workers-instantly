import prisma from "../../config/prisma.js";

export class FareService {

  static async calculateInstantFare(
    items: {
      skillId: string;
      requiredWorkers: number;
    }[]
  ) {

    let subtotal = 0;

    for (const item of items) {

      const skill =
        await prisma.skill.findUnique({
          where: {
            id: item.skillId,
          },
        });

      if (!skill) {
        throw new Error(
          "Skill not found"
        );
      }

      subtotal +=
        skill.baseRate *
        item.requiredWorkers;
    }

    const platformFee =
      subtotal * 0.10;

    const total =
      subtotal + platformFee;

    return {
      subtotal,
      platformFee,
      total,
    };
  }
}