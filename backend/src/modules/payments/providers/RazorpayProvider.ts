import Razorpay from 'razorpay';
import type { IPaymentProvider } from '../interfaces/IPaymentProvider.js';

export class RazorpayProvider implements IPaymentProvider {
  private readonly razorpay: any;

  constructor(keyId: string, keySecret: string) {
    this.razorpay = new (Razorpay as any)({
      key_id: keyId,
      key_secret: keySecret,
    });
  }

  async createRazorpayOrder(amount: number, receiptId: string): Promise<any> {
    const options = {
      amount: Math.round(amount * 100), // paise
      currency: 'INR',
      receipt: receiptId,
    };
    return this.razorpay.orders.create(options);
  }

  verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
    try {
      return (Razorpay as any).validateWebhookSignature(payload, signature, secret);
    } catch (err) {
      return false;
    }
  }
}
