export interface IPaymentProvider {
  createRazorpayOrder(amount: number, receiptId: string): Promise<any>;
  verifyWebhookSignature(payload: string, signature: string, secret: string): boolean;
  /** amount is in rupees (not paise) — converted internally, matching createRazorpayOrder. */
  refundPayment(razorpayPaymentId: string, amount: number): Promise<any>;
}
