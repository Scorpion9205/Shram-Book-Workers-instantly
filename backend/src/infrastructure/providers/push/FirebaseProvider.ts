import admin from 'firebase-admin';
import type { IPushProvider } from '../../../core/interfaces/IProviders.js';
import { Logger } from '../../../core/logger/Logger.js';

export class FirebaseProvider implements IPushProvider {
  private readonly logger = new Logger('FirebaseProvider');
  private readonly app: any = null;

  constructor(serviceAccountJson?: string) {
    if (!serviceAccountJson) {
      this.logger.warn('Firebase service account config is missing. Push notifications will be logged as warnings.');
      return;
    }

    try {
      let credentials;
      try {
        credentials = JSON.parse(serviceAccountJson);
      } catch (err) {
        credentials = JSON.parse(Buffer.from(serviceAccountJson, 'base64').toString('utf8'));
      }

      this.app = admin.initializeApp({
        credential: (admin as any).credential.cert(credentials),
      });
      this.logger.info('Firebase Admin SDK initialized successfully');
    } catch (err: any) {
      this.logger.warn(`Failed to initialize Firebase SDK: ${err.message}. Gracefully falling back to warning mode.`);
    }
  }

  async send(fcmToken: string, title: string, body: string, data?: Record<string, string>): Promise<void> {
    this.logger.info(`Sending Push Notification to token`);
    if (!this.app) {
      this.logger.warn(`[MOCK PUSH] Title: ${title}, Body: ${body}, Token: ${fcmToken}`);
      return;
    }

    try {
      await this.app.messaging().send({
        token: fcmToken,
        notification: { title, body },
        data,
      });
    } catch (err: any) {
      this.logger.warn(`Firebase push send failed: ${err.message}`);
    }
  }

  async sendMulticast(fcmTokens: string[], title: string, body: string, data?: Record<string, string>): Promise<void> {
    this.logger.info(`Sending multicast Push Notification to ${fcmTokens.length} devices`);
    if (!this.app) {
      for (const token of fcmTokens) {
        this.logger.warn(`[MOCK PUSH] Title: ${title}, Body: ${body}, Token: ${token}`);
      }
      return;
    }

    try {
      await this.app.messaging().sendEachForMulticast({
        tokens: fcmTokens,
        notification: { title, body },
        data,
      });
    } catch (err: any) {
      this.logger.warn(`Firebase multicast send failed: ${err.message}`);
    }
  }
}
