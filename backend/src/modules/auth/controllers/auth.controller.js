import { AuthService } from "../services/auth.service.js";
import { signupSchema, loginSchema } from "../validations/auth.validation.js";
import { RedisService } from "../../../shared/services/redis/redis.service.js";
import { forgotPasswordSchema, resetPasswordSchema, changePasswordSchema } from "../validations/auth.validation.js";
import { sendOTPSchema, } from "../validations/auth.validation.js";
export class AuthController {
    static async signup(req, res) {
        try {
            const validationResult = signupSchema.safeParse(req.body);
            if (!validationResult.success) {
                return res.status(400).json({
                    success: false,
                    errors: validationResult.error.issues,
                });
            }
            const result = await AuthService.signup(validationResult.data);
            return res.status(200).json({
                success: result.success,
                message: result.message,
            });
        }
        catch (error) {
            return res.status(400).json({
                success: false,
                message: error.message,
            });
        }
    }
    static async login(req, res) {
        try {
            const validationResult = loginSchema.safeParse(req.body);
            if (!validationResult.success) {
                return res.status(400).json({
                    success: false,
                    errors: validationResult.error.issues
                });
            }
            const result = await AuthService.login(validationResult.data);
            const identifier = validationResult.data.identifier;
            const rateLimitKey = `rate:login:${req.ip}:${identifier}`;
            await RedisService.del(rateLimitKey);
            res.cookie("refreshToken", result.refreshToken, {
                httpOnly: true,
                secure: false,
                sameSite: "lax",
                maxAge: 7 * 24 * 60 * 60 * 1000
            });
            return res.status(200).json({
                success: true,
                message: "Login successful",
                user: result.user,
                accessToken: result.accessToken,
            });
        }
        catch (error) {
            return res.status(400).json({
                success: false,
                message: error.message,
            });
        }
    }
    static async refreshToken(req, res) {
        try {
            const refreshToken = req.cookies.refreshToken ??
                req.body?.refreshToken;
            if (!refreshToken) {
                return res.status(401).json({
                    success: false,
                    message: "Refresh token required",
                });
            }
            const result = await AuthService.refreshToken(refreshToken);
            return res.status(200).json({
                success: true,
                accessToken: result.accessToken,
            });
        }
        catch (error) {
            return res.status(401).json({
                success: false,
                message: error.message,
            });
        }
    }
    static async logout(req, res) {
        try {
            await AuthService.logout(req.user.userId);
            res.clearCookie("refreshToken");
            return res.status(200).json({
                success: true,
                message: "Logged out successfully",
            });
        }
        catch (error) {
            return res.status(400).json({
                success: false,
                message: error.message,
            });
        }
    }
    static async forgotPassword(req, res) {
        try {
            const validation = forgotPasswordSchema.safeParse(req.body);
            if (!validation.success) {
                return res.status(400).json({
                    success: false,
                    errors: validation.error.issues,
                });
            }
            const result = await AuthService.forgotPassword(validation.data.identifier);
            return res.status(200).json(result);
        }
        catch (error) {
            return res.status(500).json({
                success: false,
                message: error.message,
            });
        }
    }
    static async resetPassword(req, res) {
        try {
            const validation = resetPasswordSchema.safeParse(req.body);
            if (!validation.success) {
                return res.status(400).json({
                    success: false,
                    errors: validation.error.issues,
                });
            }
            const result = await AuthService.resetPassword(validation.data.token, validation.data.password);
            return res.status(200).json(result);
        }
        catch (error) {
            return res.status(400).json({
                success: false,
                message: error.message,
            });
        }
    }
    static async sendOTP(req, res) {
        try {
            const validation = sendOTPSchema.safeParse(req.body);
            if (!validation.success) {
                return res.status(400).json({
                    success: false,
                    errors: validation.error.issues,
                });
            }
            const result = await AuthService.sendOTP(validation.data.identifier);
            return res.status(200).json(result);
        }
        catch (error) {
            return res.status(400).json({
                success: false,
                message: error.message,
            });
        }
    }
    static async verifyOTP(req, res) {
        try {
            const { identifier, otp } = req.body;
            if (!identifier || !otp) {
                return res.status(400).json({
                    success: false,
                    message: "Identifier and OTP are required.",
                });
            }
            const result = await AuthService.verifyOTP(identifier, otp);
            res.cookie("refreshToken", result.refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: "lax",
                maxAge: 7 * 24 * 60 * 60 * 1000,
            });
            return res.status(200).json({
                success: true,
                message: "OTP verified successfully.",
                user: result.user,
                accessToken: result.accessToken,
            });
        }
        catch (error) {
            return res.status(400).json({
                success: false,
                message: error.message,
            });
        }
    }
    static async resendOTP(req, res) {
        try {
            const validation = sendOTPSchema.safeParse(req.body);
            if (!validation.success) {
                return res.status(400).json({
                    success: false,
                    errors: validation.error.issues,
                });
            }
            const result = await AuthService.resendOTP(validation.data.identifier);
            return res.status(200).json(result);
        }
        catch (error) {
            return res.status(400).json({
                success: false,
                message: error.message,
            });
        }
    }
    static async changePassword(req, res) {
        try {
            const validation = changePasswordSchema.safeParse(req.body);
            if (!validation.success) {
                return res.status(400).json({
                    success: false,
                    errors: validation.error.issues,
                });
            }
            if (!req.user) {
                return res.status(401).json({
                    success: false,
                    message: "Unauthorized",
                });
            }
            const result = await AuthService.changePassword(req.user.userId, validation.data.currentPassword, validation.data.newPassword);
            return res.status(200).json(result);
        }
        catch (error) {
            return res.status(400).json({
                success: false,
                message: error.message,
            });
        }
    }
}
//# sourceMappingURL=auth.controller.js.map