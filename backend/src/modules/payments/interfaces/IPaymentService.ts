export interface IPaymentService {
  createOrder(bookingId: string, providerId: string): Promise<any>;
  handleWebhook(rawBody: string, payload: any, signature: string): Promise<void>;
  /**
   * Issues a Razorpay refund for a booking's payment, if (and only if) one was actually
   * captured (status COMPLETED). A no-op for bookings that were never paid, or whose payment
   * was already refunded — safe to call unconditionally from a cancel flow.
   */
  refundForCancelledBooking(bookingId: string): Promise<void>;
}
