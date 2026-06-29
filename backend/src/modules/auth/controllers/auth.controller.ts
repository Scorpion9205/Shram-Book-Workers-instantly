import type { Request, Response } from "express"
import { AuthService } from "../services/auth.service.js"
import { signupSchema, loginSchema } from "../validations/auth.validation.js"
import type { AuthRequest } from "../../../shared/middleware/auth.middleware.js"
import { redis } from "../../../shared/config/redis.js"
import { RedisService } from "../../../shared/services/redis/redis.service.js"
import { forgotPasswordSchema,resetPasswordSchema } from "../validations/auth.validation.js"
export class AuthController {
    static async signup(req: Request, res: Response) {
        try {
            const validationResult = signupSchema.safeParse(req.body)

            if (!validationResult.success) {
                return res.status(400).json({
                    success: false,
                    errors:
                        validationResult.error.issues
                })
            }

            const result = await AuthService.signup(validationResult.data)

            res.cookie("refreshToken", result.refreshToken, {
                httpOnly: true,
                secure: false,
                sameSite: "lax",
                maxAge: 7 * 24 * 60 * 60 * 1000
            })

            return res.status(201).json({
                success: true,
                message: "User registered successfully",
                user: result.user
            })
        } catch (error: any) {
            return res.status(400).json({
                success: false,
                message: error.message,
            })
        }
    }

    static async login(req: Request, res: Response) {
        try {
            const validationResult = loginSchema.safeParse(req.body)

            if (!validationResult.success) {
                return res.status(400).json({
                    success: false,
                    errors: validationResult.error.issues
                })
            }
            const result =
                await AuthService.login(
                    validationResult.data
                );

            const identifier =
                validationResult.data.identifier;

            const rateLimitKey =
                `rate:login:${req.ip}:${identifier}`;

            await RedisService.del(rateLimitKey);

            res.cookie("refreshToken", result.refreshToken), {
                httpOnly: true,
                secure: false,
                samesite: "lax"
            }
            return res.status(200).json({
                success: true,
                message: "Login successful",
                user: result.user,
                accessToken: result.accessToken,
            })
        } catch (error: any) {
            return res.status(400).json({
                success: false,
                message: error.message,
            })
        }
    }
    static async refreshToken(
        req: Request,
        res: Response
    ) {
        try {
            const refreshToken =
                req.cookies.refreshToken;

            const result =
                await AuthService.refreshToken(
                    refreshToken
                );

            return res.status(200).json({
                success: true,
                accessToken:
                    result.accessToken,
            });
        } catch (error: any) {
            return res.status(401).json({
                success: false,
                message:
                    error.message,
            });
        }
    }

    static async logout(
        req: AuthRequest,
        res: Response
    ) {
        try {
            await AuthService.logout(
                req.user!.userId
            );

            res.clearCookie(
                "refreshToken"
            );

            return res.status(200).json({
                success: true,
                message:
                    "Logged out successfully",
            });
        } catch (error: any) {
            return res.status(400).json({
                success: false,
                message:
                    error.message,
            });
        }
    }


static async forgotPassword(
  req: Request,
  res: Response
) {

  try {

    const validation =
      forgotPasswordSchema.safeParse(
        req.body
      );

    if (!validation.success) {

      return res.status(400).json({

        success: false,

        errors:
          validation.error.issues,

      });

    }

    const result =
      await AuthService.forgotPassword(
        validation.data.email
      );

    return res.status(200).json(result);

  }
  catch (error: any) {

    return res.status(500).json({

      success: false,

      message: error.message,

    });

  }

}
static async resetPassword(
  req: Request,
  res: Response
) {
  try {

    const validation =
      resetPasswordSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        errors: validation.error.issues,
      });
    }

    const result =
      await AuthService.resetPassword(
        validation.data.token,
        validation.data.password
      );

    return res.status(200).json(result);

  } catch (error: any) {

    return res.status(400).json({
      success: false,
      message: error.message,
    });

  }
}
}