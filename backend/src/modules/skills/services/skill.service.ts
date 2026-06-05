import prisma from "../../../shared/config/prisma.js";



export class SkillService {

    static async getSkills() {
        return await prisma.skill.findMany({
            orderBy: {
                name: "asc"
            }
        });
    }

    static async assignSkills(
        userId: string,
        skillIds: string[]
    ) {

        const worker =
            await prisma.workerProfile.findUnique({
                where: {
                    userId
                }
            });

        if (!worker) {
            throw new Error(
                "Worker profile not found"
            );
        }

        await prisma.workerSkill.deleteMany({
            where: {
                workerId: worker.id
            }
        });

        await prisma.workerSkill.createMany({
            data: skillIds.map(skillId => ({
                workerId: worker.id,
                skillId
            }))
        });

        return await prisma.workerSkill.findMany({
            where: {
                workerId: worker.id
            },
            include: {
                skill: true
            }
        });
    }

    static async getMySkills(
        userId: string
    ) {
        const worker =
            await prisma.workerProfile.findUnique({
                where: {
                    userId
                }
            });

        if (!worker) {
            throw new Error(
                "Worker profile not found"
            );
        }

        return await prisma.workerSkill.findMany({
            where: {
                workerId: worker.id
            },
            include: {
                skill: true
            }
        });
    }
}