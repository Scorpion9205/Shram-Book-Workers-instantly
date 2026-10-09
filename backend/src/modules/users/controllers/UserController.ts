import type { Request, Response } from 'express';
import { BaseController } from '../../../core/base/BaseController.js';
import type { IUserService } from '../interfaces/IUserService.js';
import { updateProfileSchema, changePasswordSchema } from '../validations/user.validation.js';
import { BadRequestException } from '../../../core/exceptions/index.js';

export class UserController extends BaseController {
  constructor(private readonly userService: IUserService) {
    super();
  }

  getProfile = async (req: Request, res: Response): Promise<void> => {
    const user = (req as any).user;
    const profile = await this.userService.getProfile(user.userId || user.id);

    this.ok(res, profile, 'User profile retrieved successfully');
  };

  updateProfile = async (req: Request, res: Response): Promise<void> => {
    const user = (req as any).user;
    const dto = this.validate(updateProfileSchema, req.body);

    const updated = await this.userService.updateProfile(user.userId || user.id, dto);

    this.ok(res, updated, 'User profile updated successfully');
  };

  deleteAccount = async (req: Request, res: Response): Promise<void> => {
    const user = (req as any).user;
    await this.userService.deleteAccount(user.userId || user.id);

    this.ok(res, null, 'User account successfully deleted');
  };

  changePassword = async (req: Request, res: Response): Promise<void> => {
    const user = (req as any).user;
    const dto = this.validate(changePasswordSchema, req.body);

    await this.userService.changePassword(user.userId || user.id, dto);

    this.ok(res, null, 'Password successfully updated');
  };

  uploadProfileImage = async (req: Request, res: Response): Promise<void> => {
    const user = (req as any).user;
    const reqAny = req as any;
    if (!reqAny.file) {
      throw new BadRequestException('No file uploaded');
    }

    const imageUrl = await this.userService.uploadProfileImage(
      user.userId || user.id,
      reqAny.file.buffer,
      reqAny.file.originalname,
      reqAny.file.mimetype,
    );

    this.ok(res, { profileImage: imageUrl }, 'Profile image uploaded successfully');
  };

  deleteProfileImage = async (req: Request, res: Response): Promise<void> => {
    const user = (req as any).user;
    await this.userService.deleteProfileImage(user.userId || user.id);

    this.ok(res, null, 'Profile image deleted successfully');
  };
}
