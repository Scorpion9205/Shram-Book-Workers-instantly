/**
 * Email provider contract.
 * Implementation: ResendProvider
 */
export interface IEmailProvider {
  send(to: string, subject: string, body: string, isHtml?: boolean): Promise<void>;
  sendBatch(messages: Array<{ to: string; subject: string; body: string }>): Promise<void>;
}

/**
 * SMS provider contract.
 * Implementation: ExotelProvider
 */
export interface ISmsProvider {
  send(to: string, body: string): Promise<void>;
}

/**
 * Push notification provider contract.
 * Implementation: FirebaseProvider
 */
export interface IPushProvider {
  send(fcmToken: string, title: string, body: string, data?: Record<string, string>): Promise<void>;
  sendMulticast(fcmTokens: string[], title: string, body: string, data?: Record<string, string>): Promise<void>;
}

/**
 * File storage provider contract.
 * Implementation: S3Provider
 */
export interface IStorageProvider {
  upload(key: string, buffer: Buffer, contentType: string): Promise<string>;
  getSignedUrl(key: string, expirySeconds?: number): Promise<string>;
  delete(key: string): Promise<void>;
}
