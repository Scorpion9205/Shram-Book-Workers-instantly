import { SkillService } from "../services/skill.service.js";
import { assignSkillsSchema } from "../validations/skill.validation.js";
export class SkillController {
    static async getSkills(req, res) {
        try {
            const skills = await SkillService.getSkills();
            return res.status(200).json({
                success: true,
                skills
            });
        }
        catch (error) {
            return res.status(500).json({
                success: false,
                message: error.message
            });
        }
    }
    static async assignSkills(req, res) {
        try {
            const validationResult = assignSkillsSchema.safeParse(req.body);
            if (!validationResult.success) {
                return res.status(400).json({
                    success: false,
                    errors: validationResult.error.flatten()
                        .fieldErrors
                });
            }
            const skills = await SkillService.assignSkills(req.user.userId, validationResult.data.skillIds);
            return res.status(200).json({
                success: true,
                skills
            });
        }
        catch (error) {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }
    static async getMySkills(req, res) {
        try {
            const skills = await SkillService.getMySkills(req.user.userId);
            return res.status(200).json({
                success: true,
                skills
            });
        }
        catch (error) {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }
}
//# sourceMappingURL=skill.controller.js.map