import type { CreateInstantRequestInput } from '../validations/instant-request.validation.js';

export interface IInstantRequestService {
  createInstantRequest(userId: string, data: CreateInstantRequestInput): Promise<any>;
  getNearbyRequests(userId: string): Promise<any[]>;
  acceptRequest(userId: string, itemId: string): Promise<any>;
  getMyRequests(userId: string): Promise<any[]>;
  submitBid(userId: string, requestId: string, bidAmount: number): Promise<any>;
  selectBid(userId: string, requestId: string, bidId: string): Promise<any>;
  cancelRequest(userId: string, requestId: string): Promise<void>;

  /** No location/radius filter — an Agent isn't "at" a single location the way a Worker is. */
  getOpenRequestsForSkills(skillIds: string[]): Promise<any[]>;
  /** Agent-assign counterpart to acceptRequest — same DIRECT-mode item-accept flow, keyed by a specific roster workerId instead of the caller's own account. */
  assignWorkerToItem(agentId: string, itemId: string, workerId: string, workerUserId: string): Promise<any>;
}
