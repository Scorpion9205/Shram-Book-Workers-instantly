import Razorpay from 'razorpay';
import type { IPaymentProvider } from '../interfaces/IPaymentProvider.js';
import { BusinessException } from '../../../core/exceptions/index.js';
import { Logger } from '../../../core/logger/Logger.js';

const logger = new Logger('RazorpayProvider');

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
    try {
      return await this.razorpay.orders.create(options);
    } catch (err) {
      throw this.toBusinessError(err, 'create order');
    }
  }

  // The Razorpay SDK rejects with a plain object ({ statusCode, error: { code, description } }),
  // not an Error, which our error handler would report as an anonymous 500. Turn it into a
  // readable error and log the reason (typical causes: wrong/mismatched API keys).
  private toBusinessError(err: any, action: string): BusinessException {
    const description = err?.error?.description || err?.message || 'Unknown Razorpay error';
    logger.error(`Razorpay ${action} failed: ${description}`, { statusCode: err?.statusCode, code: err?.error?.code });
    return new BusinessException('PAYMENT_PROVIDER_ERROR', `Payment provider error: ${description}`);
  }

  verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
    try {
      return (Razorpay as any).validateWebhookSignature(payload, signature, secret);
    } catch (err) {
      return false;
    }
  }

  async refundPayment(razorpayPaymentId: string, amount: number): Promise<any> {
    try {
      return await this.razorpay.payments.refund(razorpayPaymentId, {
        amount: Math.round(amount * 100), // paise
      });
    } catch (err) {
      throw this.toBusinessError(err, 'refund');
    }
  }
}
