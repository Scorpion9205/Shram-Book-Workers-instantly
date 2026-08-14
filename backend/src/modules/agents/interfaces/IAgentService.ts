export interface IAgentService {
  createProfile(userId: string, data: any): Promise<any>;
  getMyProfile(userId: string): Promise<any>;
  updateProfile(userId: string, data: any): Promise<any>;
  getDashboard(userId: string): Promise<any>;
  getMyApplications(userId: string): Promise<any[]>;
  getMyBookings(userId: string): Promise<any[]>;
}
