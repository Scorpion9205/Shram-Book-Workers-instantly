export interface IWalletService {
  getWalletBalance(userId: string): Promise<any>;
  getTransactionHistory(userId: string): Promise<any[]>;
  creditWallet(workerId: string, amount: number, purpose: any, referenceId?: string): Promise<void>;
  debitWallet(workerId: string, amount: number, purpose: any, referenceId?: string): Promise<void>;
}
