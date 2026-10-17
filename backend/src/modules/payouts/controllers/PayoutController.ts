import type { Request, Response } from 'express';
import { BaseController } from '../../../core/base/BaseController.js';
import type { IPayoutService } from '../interfaces/IPayoutService.js';
import {
  listPayoutsQuerySchema,
  markPaidSchema,
  payoutDetailsSchema,
  rejectPayoutSchema,
  workerWithdrawalSchema,
} from '../validators/payout.validation.js';

// Parses the request, hands off to PayoutService, and wraps the answer.
export class PayoutController extends BaseController {
  constructor(private readonly payoutService: IPayoutService) {
    super();
  }

  requestWorkerWithdrawal = async (req: Request, res: Response): Promise<void> => {
    const user = (req as any).user;
    const { amount, ...details } = this.validate(workerWithdrawalSchema, req.body) as any;
    const result = await this.payoutService.requestWorkerWithdrawal(user.userId, amount, details);
    this.created(res, result, 'Withdrawal requested. It will be paid after admin approval.');
  };

  getAgentSummary = async (req: Request, res: Response): Promise<void> => {
    const user = (req as any).user;
    this.ok(res, await this.payoutService.getAgentSummary(user.userId), 'Payout summary retrieved.');
  };

  requestAgentCommission = async (req: Request, res: Response): Promise<void> => {
    const user = (req as any).user;
    const details = this.validate(payoutDetailsSchema, req.body) as any;
    const result = await this.payoutService.requestAgentCommission(user.userId, details);
    this.created(res, result, 'Commission payout requested.');
  };

  requestAgentWorkerFunds = async (req: Request, res: Response): Promise<void> => {
    const user = (req as any).user;
    const details = this.validate(payoutDetailsSchema, req.body) as any;
    const result = await this.payoutService.requestAgentWorkerFunds(user.userId, details);
    this.created(res, result, 'Workers payout requested.');
  };

  listMine = async (req: Request, res: Response): Promise<void> => {
    const user = (req as any).user;
    this.ok(res, await this.payoutService.listMyRequests(user.userId), 'Payout requests retrieved.');
  };

  // ---- admin ----

  list = async (req: Request, res: Response): Promise<void> => {
    const filter = this.validate(listPayoutsQuerySchema, req.query);
    this.ok(res, await this.payoutService.listRequests(filter), 'Payout requests retrieved.');
  };

  getPlatformSummary = async (_req: Request, res: Response): Promise<void> => {
    this.ok(res, await this.payoutService.getPlatformSummary(), 'Payout summary retrieved.');
  };

  markPaid = async (req: Request, res: Response): Promise<void> => {
    const user = (req as any).user;
    const { transactionRef } = this.validate(markPaidSchema, req.body);
    const result = await this.payoutService.markPaid(user.userId, String(req.params.id), transactionRef);
    this.ok(res, result, 'Payout marked as paid.');
  };

  reject = async (req: Request, res: Response): Promise<void> => {
    const user = (req as any).user;
    const { reason } = this.validate(rejectPayoutSchema, req.body);
    const result = await this.payoutService.reject(user.userId, String(req.params.id), reason);
    this.ok(res, result, 'Payout rejected.');
  };
}
