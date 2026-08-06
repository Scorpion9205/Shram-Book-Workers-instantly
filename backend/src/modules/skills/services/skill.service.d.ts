export declare class SkillService {
    static getSkills(): Promise<{
        id: string;
        name: string;
        baseRate: number;
    }[]>;
    static assignSkills(userId: string, skillIds: string[]): Promise<{
        id: string;
        name: string;
        baseRate: number;
    }[]>;
    static getMySkills(userId: string): Promise<{
        id: string;
        name: string;
        baseRate: number;
    }[]>;
}
//# sourceMappingURL=skill.service.d.ts.map