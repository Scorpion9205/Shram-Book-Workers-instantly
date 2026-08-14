import type { ISmsProvider } from '../../../core/interfaces/IProviders.js';
import { Logger } from '../../../core/logger/Logger.js';

export class ExotelProvider implements ISmsProvider {
  private readonly logger = new Logger('ExotelProvider');

  constructor(
    private readonly apiKey?: string,
    private readonly apiToken?: string,
    private readonly accountSid?: string,
    private readonly fromSender: string = 'SHRAM',
  ) {
    if (!apiKey || !apiToken || !accountSid) {
      this.logger.warn('Exotel SMS configuration is incomplete. SMS will be logged to console only.');
    }
  }

  async send(to: string, body: string): Promise<void> {
    this.logger.info(`Sending SMS to ${to}`);
    if (!this.apiKey || !this.apiToken || !this.accountSid) {
      this.logger.info(`[MOCK SMS] To: ${to}, Message: ${body}`);
      return;
    }

    try {
      const url = `https://api.exotel.com/v1/Accounts/${this.accountSid}/Sms/send.json`;
      const auth = Buffer.from(`${this.apiKey}:${this.apiToken}`).toString('base64');

      const formData = new URLSearchParams();
      formData.append('From', this.fromSender);
      formData.append('To', to);
      formData.append('Body', body);

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Exotel API returned status ${res.status}: ${errorText}`);
      }

      this.logger.info(`SMS sent successfully to ${to}`);
    } catch (err) {
      this.logger.error(`Failed to send SMS to ${to}`, err);
      throw err;
    }
  }
}
