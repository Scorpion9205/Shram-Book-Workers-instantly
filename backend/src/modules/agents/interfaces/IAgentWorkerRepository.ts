export interface WorkerBankDetails {
  accountHolderName: string | null;
  accountNumber: string | null;
  ifscCode: string | null;
  bankName: string | null;
}

export interface AgentWorkerRosterEntry {
  id: string;
  workerId: string;
  verifiedByAgent: boolean;
  createdAt: Date;
  worker: {
    id: string;
    userId: string;
    isAvailable: boolean;
    dailyRate: number | null;
    latitude: number | null;
    longitude: number | null;
    user: { id: string; name: string; phone: string | null; isActive: boolean };
    skills: { skillId: string; skill: { id: string; name: string } }[];
    bankDetails: WorkerBankDetails;
  };
}

export interface AgentWorkerLink {
  id: string;
  agentId: string;
  workerId: string;
  verifiedByAgent: boolean;
  worker: { userId: string };
}

export interface CreateManagedWorkerInput {
  name: string;
  phone?: string | null | undefined;
  skillIds: string[];
  dailyRate?: number | null | undefined;
  latitude?: number | null | undefined;
  longitude?: number | null | undefined;
}

export interface IAgentWorkerRepository {
  countByAgentId(agentId: string): Promise<number>;
  countAvailableByAgentId(agentId: string): Promise<number>;
  findManyByAgentId(agentId: string): Promise<AgentWorkerRosterEntry[]>;
  /** Ownership check — confirms `workerId` is actually on `agentId`'s roster before any mutation. */
  findLinkByAgentAndWorker(agentId: string, workerId: string): Promise<AgentWorkerLink | null>;
  /**
   * Creates a User (role WORKER, no phone/password/OTP required) + WorkerProfile + WorkerSkill
   * rows + the AgentWorker link, all in one transaction — for a real-world worker who has no
   * smartphone and is onboarded entirely by the Agent in person.
   */
  createManagedWorker(agentId: string, data: CreateManagedWorkerInput): Promise<AgentWorkerRosterEntry>;
  setVerified(agentId: string, workerId: string, verified: boolean): Promise<AgentWorkerRosterEntry>;
  deleteLink(agentId: string, workerId: string): Promise<void>;
  setWorkerBankDetails(
    workerId: string,
    data: { accountHolderName: string; accountNumber: string; ifscCode: string; bankName: string },
  ): Promise<AgentWorkerRosterEntry>;
}
