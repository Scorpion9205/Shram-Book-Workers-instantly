export interface IPaymentService {
  createOrder(bookingId: string, providerId: string): Promise<any>;
  /**
   * After the work is done on an OFFLINE booking, makes (or re-shows) a Razorpay Payment Link for
   * the booking amount. The worker (or their agent) shows its QR; when the provider pays, the
   * webhook settles the booking automatically.
   */
  createCompletionPayment(bookingId: string, userId: string): Promise<{ linkId: string; url: string; amount: number }>;
  handleWebhook(rawBody: string, payload: any, signature: string): Promise<void>;
  /**
   * Issues a Razorpay refund for a booking's payment, if (and only if) one was actually
   * captured (status COMPLETED). A no-op for bookings that were never paid, or whose payment
   * was already refunded — safe to call unconditionally from a cancel flow.
   */
  refundForCancelledBooking(bookingId: string): Promise<void>;
}
