export interface IPaymentService {
  createOrder(bookingId: string, providerId: string): Promise<any>;
  handleWebhook(rawBody: string, payload: any, signature: string): Promise<void>;
}
