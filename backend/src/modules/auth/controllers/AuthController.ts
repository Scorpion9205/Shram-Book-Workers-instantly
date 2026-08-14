import type { Request, Response } from 'express';
import { BaseController } from '../../../core/base/BaseController.js';
import type { IAuthService } from '../interfaces/IAuthService.js';
import type { ICacheService } from '../../../core/interfaces/ICacheService.js';
import { RequestOTPSchema } from '../dto/RequestOTP.dto.js';
import { VerifyOTPSchema } from '../dto/VerifyOTP.dto.js';
import { AdminLoginSchema } from '../dto/AdminLogin.dto.js';
import { GoogleAuthSchema } from '../dto/GoogleAuth.dto.js';
import { RefreshTokenSchema } from '../dto/RefreshToken.dto.js';
import { z } from 'zod';

export class AuthController extends BaseController {
  constructor(
    private readonly authService: IAuthService,
    private readonly cache: ICacheService,
  ) {
    super();
  }

  requestOTP = async (req: Request, res: Response): Promise<void> => {
    const dto = this.validate(RequestOTPSchema, req.body);
    
    // Store role temporarily for signup profile creation
    await this.cache.set(`signup:role:${dto.identifier}`, dto.role, 600); // 10m TTL
    
    await this.authService.requestOTP(dto.channel, dto.identifier, dto.role);
    this.ok(res, null, `OTP code successfully dispatched to your registered ${dto.channel.toLowerCase()}`);
  };

  verifyOTP = async (req: Request, res: Response): Promise<void> => {
    const dto = this.validate(VerifyOTPSchema, req.body);
    const result = await this.authService.verifyOTP(dto.channel, dto.identifier, dto.code);

    // Set refresh token in HttpOnly cookie
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // Remove temporary signup role cache
    await this.cache.del(`signup:role:${dto.identifier}`);

    this.ok(res, {
      user: result.user,
      accessToken: result.accessToken,
    }, 'OTP verified and login successful');
  };

  adminLogin = async (req: Request, res: Response): Promise<void> => {
    const dto = this.validate(AdminLoginSchema, req.body);
    const result = await this.authService.adminLogin(dto.email, dto.password);

    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    this.ok(res, {
      user: result.user,
      accessToken: result.accessToken,
    }, 'Administrator/Agent login successful');
  };

  googleAuth = async (req: Request, res: Response): Promise<void> => {
    const dto = this.validate(GoogleAuthSchema, req.body);
    const result = await this.authService.googleAuth(dto.idToken, dto.role);

    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    this.ok(res, {
      user: result.user,
      accessToken: result.accessToken,
    }, 'Google authentication successful');
  };

  refreshToken = async (req: Request, res: Response): Promise<void> => {
    // Read from HttpOnly cookie, fallback to request body (useful for mobile clients)
    const token = req.cookies?.refreshToken || req.body?.refreshToken;
    
    // Validate token present
    const dto = this.validate(RefreshTokenSchema, { refreshToken: token });
    const result = await this.authService.refreshToken(dto.refreshToken);

    this.ok(res, result, 'Access token refreshed successfully');
  };

  logout = async (req: Request, res: Response): Promise<void> => {
    const userId = (req as any).user?.id;
    if (userId) {
      await this.authService.logout(userId);
    }
    
    res.clearCookie('refreshToken');
    this.noContent(res);
  };

  changePassword = async (req: Request, res: Response): Promise<void> => {
    const userId = (req as any).user?.id;
    
    // Zod schema for password changes
    const changeSchema = z.object({
      currentPassword: z.string().min(1, 'Current password is required'),
      newPassword: z.string().min(8, 'New password must be at least 8 characters'),
    });

    const dto = this.validate(changeSchema, req.body);
    await this.authService.changePassword(userId, dto.currentPassword, dto.newPassword);
    this.ok(res, null, 'Password updated successfully');
  };
}
