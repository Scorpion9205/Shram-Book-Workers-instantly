import type { PayoutRequest, PayoutRequestKind, PayoutRequestStatus } from '@prisma/client';
import { BaseService } from '../../../core/base/BaseService.js';
import { BusinessException, NotFoundException } from '../../../core/exceptions/index.js';
import type { IPlatformRatesService } from '../../../shared/pricing/PlatformRatesService.js';
import { splitSettledBooking } from '../../../shared/pricing/bookingPricing.js';
import type { IAgentRepository } from '../../agents/interfaces/IAgentRepository.js';
import type {
  AgentSettledBooking,
  IPayoutRepository,
  PayoutDetails,
  PayoutRequestWithUser,
} from '../interfaces/IPayoutRepository.js';
import type {
  AgentPayoutSummary,
  IPayoutService,
  PayoutRates,
  PlatformPayoutSummary,
} from '../interfaces/IPayoutService.js';

// Requests below this are not worth an admin transfer. In rupees.
const MINIMUM_PAYOUT = 100;

const round2 = (n: number): number => Math.round(n * 100) / 100;

/**
 * Money going OUT of the platform to workers and agents. Provider money comes in through
 * Razorpay to the company's bank account; people are paid from there by the admin (UPI / bank
 * transfer outside the app) and the admin then marks the request paid here.
 *
 * Three kinds of request, all handled the same way:
 *  - WORKER_WALLET: a self-managed worker withdraws their wallet balance
 *  - AGENT_COMMISSION: an agent claims their own cut
 *  - AGENT_WORKER_FUNDS: an agent claims, in one lump, what their managed workers are owed,
 *    then hands each worker their part (marked per worker in AgentService.payoutWorker)
 */
export class PayoutService extends BaseService implements IPayoutService {
  constructor(
    private readonly payoutRepo: IPayoutRepository,
    private readonly agentRepo: IAgentRepository,
    private readonly ratesService: IPlatformRatesService,
  ) {
    super('PayoutService');
  }

  async getRates(): Promise<PayoutRates> {
    return this.ratesService.getRates();
  }

  async requestWorkerWithdrawal(userId: string, amount: number, details: PayoutDetails): Promise<PayoutRequest> {
    this.log('Worker requesting wallet withdrawal', { userId, amount });
    const rounded = round2(amount);
    this.assertMinimum(rounded);
    return this.payoutRepo.createWorkerWithdrawal(userId, rounded, details);
  }

  async getAgentSummary(agentUserId: string): Promise<AgentPayoutSummary> {
    const agent = await this.getAgent(agentUserId);
    const [settled, rates] = await Promise.all([
      this.payoutRepo.findAgentSettledBookings(agent.id),
      this.getRates(),
    ]);
    const bookings = settled.filter((b) => b.paymentMode === 'ONLINE');
    const cashDues = { amount: 0, bookingCount: 0 };
    for (const b of this.unsettledCashBookings(settled)) {
      cashDues.amount += this.platformDue(b);
      cashDues.bookingCount += 1;
    }
    cashDues.amount = round2(cashDues.amount);

    const commission = { availableAmount: 0, availableBookingCount: 0, requestedAmount: 0, paidAmount: 0 };
    const workerFunds = {
      availableAmount: 0,
      availableBookingCount: 0,
      requestedAmount: 0,
      releasedAmount: 0,
      toDistributeAmount: 0,
    };

    for (const b of bookings) {
      const split = splitSettledBooking(b, true);

      if (b.commissionCheckedOutAt) commission.paidAmount += split.agent;
      else if (b.commissionRequestId) commission.requestedAmount += split.agent;
      else {
        commission.availableAmount += split.agent;
        commission.availableBookingCount += 1;
      }

      if (b.workerFundsReleasedAt) {
        workerFunds.releasedAmount += split.worker;
        if (!b.payoutPaidAt) workerFunds.toDistributeAmount += split.worker;
      } else if (b.workerFundsRequestId) workerFunds.requestedAmount += split.worker;
      else {
        workerFunds.availableAmount += split.worker;
        workerFunds.availableBookingCount += 1;
      }
    }

    for (const group of [commission, workerFunds]) {
      for (const key of Object.keys(group) as (keyof typeof group)[]) {
        if (!key.endsWith('Count')) (group as any)[key] = round2((group as any)[key]);
      }
    }

    return { rates, minimumPayout: MINIMUM_PAYOUT, cashDues, commission, workerFunds };
  }

  async requestAgentCommission(agentUserId: string, details: PayoutDetails): Promise<PayoutRequest> {
    this.log('Agent requesting commission payout', { agentUserId });
    const agent = await this.getAgent(agentUserId);
    const settled = await this.payoutRepo.findAgentSettledBookings(agent.id);
    const bookings = settled.filter((b) => b.paymentMode === 'ONLINE');

    const claimable = bookings.filter((b) => !b.commissionRequestId && !b.commissionCheckedOutAt);
    const amount = round2(
      claimable.reduce(
        (sum, b) => sum + splitSettledBooking(b, true).agent,
        0,
      ),
    );
    this.assertMinimum(amount);

    // Cash dues are normally taken from the (larger) workers' payout; this only takes what is
    // still unsettled by the time commission is requested.
    const dues = this.netCashDues(settled, amount);
    return this.payoutRepo.createAgentRequest(
      'AGENT_COMMISSION',
      agentUserId,
      round2(amount - dues.amount),
      details,
      claimable.map((b) => b.id),
      dues,
    );
  }

  async requestAgentWorkerFunds(agentUserId: string, details: PayoutDetails): Promise<PayoutRequest> {
    this.log('Agent requesting worker funds payout', { agentUserId });
    const agent = await this.getAgent(agentUserId);
    const settled = await this.payoutRepo.findAgentSettledBookings(agent.id);
    const bookings = settled.filter((b) => b.paymentMode === 'ONLINE');

    const claimable = bookings.filter((b) => !b.workerFundsRequestId);
    const amount = round2(
      claimable.reduce(
        (sum, b) => sum + splitSettledBooking(b, true).worker,
        0,
      ),
    );
    this.assertMinimum(amount);

    // The platform's share of any cash the agent collected is taken off this payout, so the
    // company never loses money on cash bookings.
    const dues = this.netCashDues(settled, amount);
    return this.payoutRepo.createAgentRequest(
      'AGENT_WORKER_FUNDS',
      agentUserId,
      round2(amount - dues.amount),
      details,
      claimable.map((b) => b.id),
      dues,
    );
  }

  async listMyRequests(userId: string): Promise<PayoutRequest[]> {
    return this.payoutRepo.listByUser(userId);
  }

  async listRequests(filter: {
    status?: PayoutRequestStatus;
    kind?: PayoutRequestKind;
  }): Promise<PayoutRequestWithUser[]> {
    return this.payoutRepo.list(filter);
  }

  async getPlatformSummary(): Promise<PlatformPayoutSummary> {
    const [rows, rates] = await Promise.all([this.payoutRepo.totals(), this.getRates()]);

    const byKind = (['WORKER_WALLET', 'AGENT_COMMISSION', 'AGENT_WORKER_FUNDS'] as PayoutRequestKind[]).map((kind) => {
      const pending = rows.find((r) => r.kind === kind && r.status === 'PENDING');
      const paid = rows.find((r) => r.kind === kind && r.status === 'PAID');
      return {
        kind,
        pendingCount: pending?.count ?? 0,
        pendingAmount: round2(pending?.amount ?? 0),
        paidAmount: round2(paid?.amount ?? 0),
      };
    });

    return {
      rates,
      pending: {
        count: byKind.reduce((s, k) => s + k.pendingCount, 0),
        amount: round2(byKind.reduce((s, k) => s + k.pendingAmount, 0)),
      },
      paid: {
        count: rows.filter((r) => r.status === 'PAID').reduce((s, r) => s + r.count, 0),
        amount: round2(byKind.reduce((s, k) => s + k.paidAmount, 0)),
      },
      byKind,
    };
  }

  async markPaid(adminUserId: string, requestId: string, transactionRef: string): Promise<PayoutRequest> {
    this.log('Admin marking payout paid', { adminUserId, requestId });
    const paid = await this.payoutRepo.markPaid(requestId, adminUserId, transactionRef);
    if (!paid) await this.explainNotPending(requestId);
    return paid!;
  }

  async reject(adminUserId: string, requestId: string, reason: string): Promise<PayoutRequest> {
    this.log('Admin rejecting payout', { adminUserId, requestId });
    const rejected = await this.payoutRepo.reject(requestId, adminUserId, reason);
    if (!rejected) await this.explainNotPending(requestId);
    return rejected!;
  }

  // Throws the right error when markPaid/reject found nothing to update.
  private async explainNotPending(requestId: string): Promise<never> {
    const existing = await this.payoutRepo.findById(requestId);
    if (!existing) throw new NotFoundException('PayoutRequest', requestId);
    throw new BusinessException('PAYOUT_NOT_PENDING', `This request is already ${existing.status.toLowerCase()}.`);
  }

  // Cash (OFFLINE) bookings of the agent whose platform share has not been settled yet.
  private unsettledCashBookings(settled: AgentSettledBooking[]): AgentSettledBooking[] {
    return settled.filter((b) => b.paymentMode === 'OFFLINE' && !b.duesRequestId && !b.platformDueSettledAt);
  }

  // What the agent owes the platform for one cash booking: the platform's share after the
  // agent's own cut, which the agent already keeps out of the cash.
  private platformDue(b: AgentSettledBooking): number {
    return splitSettledBooking(b, true).platform;
  }

  // Picks the oldest unsettled cash bookings whose dues fit within the budget (the payout being
  // requested), so a payout is never pushed below zero.
  private netCashDues(
    settled: AgentSettledBooking[],
    budget: number,
  ): { bookingIds: string[]; amount: number } {
    const bookingIds: string[] = [];
    let amount = 0;
    for (const b of this.unsettledCashBookings(settled)) {
      const due = this.platformDue(b);
      if (amount + due > budget) break;
      amount += due;
      bookingIds.push(b.id);
    }
    return { bookingIds, amount: round2(amount) };
  }

  private assertMinimum(amount: number): void {
    if (amount < MINIMUM_PAYOUT) {
      throw new BusinessException('MINIMUM_PAYOUT_NOT_MET', `The minimum payout is ₹${MINIMUM_PAYOUT}.`);
    }
  }

  private async getAgent(agentUserId: string) {
    const agent = await this.agentRepo.findByUserId(agentUserId);
    if (!agent) throw new NotFoundException('AgentProfile', agentUserId);
    return agent;
  }
}
