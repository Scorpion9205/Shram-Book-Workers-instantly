export interface IAdminService {
  getDashboardStats(): Promise<any>;
  updatePlatformSetting(key: string, value: string): Promise<any>;
}
