import prisma from "../../../shared/config/prisma.js";
export class SkillService {
    static async getSkills() {
        return await prisma.skill.findMany({
            orderBy: {
                name: "asc"
            }
        });
    }
    static async assignSkills(userId, skillIds) {
        const uniqueSkillIds = Array.from(new Set(skillIds));
        const worker = await prisma.workerProfile.upsert({
            where: {
                userId
            },
            update: {},
            create: {
                userId
            },
        });
        const skills = await prisma.skill.findMany({
            where: {
                id: {
                    in: uniqueSkillIds
                }
            }
        });
        if (skills.length !== uniqueSkillIds.length) {
            throw new Error("Invalid skill selected");
        }
        await prisma.workerSkill.deleteMany({
            where: {
                workerId: worker.id
            }
        });
        await prisma.workerSkill.createMany({
            data: uniqueSkillIds.map(skillId => ({
                workerId: worker.id,
                skillId
            }))
        });
        const workerSkills = await prisma.workerSkill.findMany({
            where: {
                workerId: worker.id,
            },
            include: {
                skill: true,
            },
        });
        return workerSkills.map((item) => item.skill);
    }
    static async getMySkills(userId) {
        const worker = await prisma.workerProfile.upsert({
            where: {
                userId
            },
            update: {},
            create: {
                userId
            },
        });
        const workerSkills = await prisma.workerSkill.findMany({
            where: {
                workerId: worker.id,
            },
            include: {
                skill: true,
            },
        });
        return workerSkills.map((item) => item.skill);
    }
}
//# sourceMappingURL=skill.service.js.map