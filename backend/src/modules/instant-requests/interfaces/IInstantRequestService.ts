import type { CreateInstantRequestInput } from '../validations/instant-request.validation.js';

export interface IInstantRequestService {
  createInstantRequest(userId: string, data: CreateInstantRequestInput): Promise<any>;
  getNearbyRequests(userId: string): Promise<any[]>;
  acceptRequest(userId: string, itemId: string): Promise<any>;
  getMyRequests(userId: string): Promise<any[]>;
  submitBid(userId: string, requestId: string, bidAmount: number): Promise<any>;
  selectBid(userId: string, requestId: string, bidId: string): Promise<any>;
}
