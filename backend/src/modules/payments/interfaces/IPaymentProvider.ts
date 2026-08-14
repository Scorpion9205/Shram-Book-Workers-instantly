export interface IPaymentProvider {
  createRazorpayOrder(amount: number, receiptId: string): Promise<any>;
  verifyWebhookSignature(payload: string, signature: string, secret: string): boolean;
}
