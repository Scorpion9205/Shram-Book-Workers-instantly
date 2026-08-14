import type { Request, Response } from 'express';
import { BaseController } from '../../../core/base/BaseController.js';
import type { IWalletService } from '../interfaces/IWalletService.js';

export class WalletController extends BaseController {
  constructor(private readonly walletService: IWalletService) {
    super();
  }

  getBalance = async (req: Request, res: Response): Promise<void> => {
    const user = (req as any).user;
    const balanceInfo = await this.walletService.getWalletBalance(user.userId);
    this.ok(res, balanceInfo, 'Wallet balance retrieved successfully.');
  };

  getTransactionHistory = async (req: Request, res: Response): Promise<void> => {
    const user = (req as any).user;
    const history = await this.walletService.getTransactionHistory(user.userId);
    this.ok(res, history, 'Transaction history retrieved successfully.');
  };
}
