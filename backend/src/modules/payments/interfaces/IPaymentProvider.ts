export interface IPaymentProvider {
  createRazorpayOrder(amount: number, receiptId: string): Promise<any>;
  /**
   * Creates a Razorpay Payment Link for an exact amount (rupees). The payer opens the link (or
   * scans a QR of it), pays with any UPI app or card, and Razorpay fires a "payment_link.paid"
   * webhook. `url` is the short link to put in a QR code.
   */
  createPaymentLink(amount: number, bookingId: string, description: string): Promise<{ id: string; url: string }>;
  /** Looks up a link so a still-unpaid one can be shown again instead of creating a new one. */
  fetchPaymentLink(linkId: string): Promise<{ id: string; url: string; status: string }>;
  verifyWebhookSignature(payload: string, signature: string, secret: string): boolean;
  /** amount is in rupees (not paise) — converted internally, matching createRazorpayOrder. */
  refundPayment(razorpayPaymentId: string, amount: number): Promise<any>;
}
