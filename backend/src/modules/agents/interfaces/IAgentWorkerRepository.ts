export interface IAgentWorkerRepository {
  countByAgentId(agentId: string): Promise<number>;
  countAvailableByAgentId(agentId: string): Promise<number>;
  findManyByAgentId(agentId: string): Promise<any[]>;
}
