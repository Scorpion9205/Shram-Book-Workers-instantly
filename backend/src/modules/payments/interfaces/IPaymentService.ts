export interface IPaymentService {
  createOrder(bookingId: string, providerId: string): Promise<any>;
  handleWebhook(payload: any, signature: string): Promise<void>;
}
