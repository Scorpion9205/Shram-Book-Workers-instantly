export interface WorkerWithSkillsAndUser {
  id: string;
  userId: string;
  isAvailable: boolean;
  skills: { skillId: string }[];
  user: { isActive: boolean };
}

export interface ILocationRepository {
  findWorkerWithSkillsAndUser(userId: string): Promise<WorkerWithSkillsAndUser | null>;
  updateWorkerCoordinates(workerId: string, latitude: number, longitude: number): Promise<void>;
  findWorkerLocation(userId: string): Promise<{ latitude: number | null; longitude: number | null } | null>;
}
