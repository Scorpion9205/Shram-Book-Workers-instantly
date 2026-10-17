import type { AgentWorkerRosterEntry, CreateManagedWorkerInput } from './IAgentWorkerRepository.js';

export interface IAgentService {
  createProfile(userId: string, data: any): Promise<any>;
  getMyProfile(userId: string): Promise<any>;
  updateProfile(userId: string, data: any): Promise<any>;
  getDashboard(userId: string): Promise<any>;
  getMyApplications(userId: string): Promise<any[]>;
  getMyBookings(userId: string): Promise<any[]>;
  getCommissionSummary(userId: string): Promise<any>;

  createManagedWorker(agentUserId: string, data: CreateManagedWorkerInput): Promise<AgentWorkerRosterEntry>;
  listMyWorkers(agentUserId: string): Promise<AgentWorkerRosterEntry[]>;
  setWorkerAvailability(
    agentUserId: string,
    workerId: string,
    isAvailable: boolean,
    location?: { latitude: number; longitude: number },
  ): Promise<void>;
  setWorkerVerified(agentUserId: string, workerId: string, verified: boolean): Promise<AgentWorkerRosterEntry>;
  removeWorker(agentUserId: string, workerId: string): Promise<void>;

  // No wallet/commission for the Agent — they're salaried by the company, outside this app.
  // Instead: see what each worker has earned, and manually settle it (cash or bank transfer).
  getWorkerEarnings(agentUserId: string, workerId: string): Promise<any>;
  payoutWorker(agentUserId: string, workerId: string, method: 'CASH' | 'BANK_TRANSFER'): Promise<void>;
  setWorkerBankDetails(
    agentUserId: string,
    workerId: string,
    data: { accountHolderName: string; accountNumber: string; ifscCode: string; bankName: string },
  ): Promise<AgentWorkerRosterEntry>;

  assignWorkerToApplication(agentUserId: string, applicationId: string, workerId: string): Promise<any>;

  getOpenInstantRequests(agentUserId: string): Promise<any[]>;
  assignWorkerToInstantItem(agentUserId: string, itemId: string, workerId: string): Promise<any>;
}
