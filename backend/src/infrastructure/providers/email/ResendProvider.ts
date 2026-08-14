import { Resend } from 'resend';
import type { IEmailProvider } from '../../../core/interfaces/IProviders.js';
import { Logger } from '../../../core/logger/Logger.js';

export class ResendProvider implements IEmailProvider {
  private readonly logger = new Logger('ResendProvider');
  private readonly resend: Resend | null = null;

  constructor(apiKey?: string, private readonly fromAddress: string = 'noreply@shram.in') {
    if (apiKey) {
      this.resend = new Resend(apiKey);
    } else {
      this.logger.warn('Resend API key is not configured. Emails will be logged to console only.');
    }
  }

  async send(to: string, subject: string, body: string, isHtml: boolean = true): Promise<void> {
    this.logger.info(`Sending email to ${to} with subject "${subject}"`);
    if (!this.resend) {
      this.logger.info(`[MOCK EMAIL] To: ${to}, Subject: ${subject}, Body: ${body}`);
      return;
    }

    try {
      const payload: any = {
        from: this.fromAddress,
        to,
        subject,
      };

      if (isHtml) {
        payload.html = body;
      } else {
        payload.text = body;
      }

      await this.resend.emails.send(payload);
    } catch (err) {
      this.logger.error(`Failed to send email to ${to}`, err);
      throw err;
    }
  }

  async sendBatch(messages: Array<{ to: string; subject: string; body: string }>): Promise<void> {
    this.logger.info(`Sending batch of ${messages.length} emails`);
    if (!this.resend) {
      for (const msg of messages) {
        this.logger.info(`[MOCK EMAIL] To: ${msg.to}, Subject: ${msg.subject}, Body: ${msg.body}`);
      }
      return;
    }

    try {
      const payload = messages.map(msg => ({
        from: this.fromAddress,
        to: msg.to,
        subject: msg.subject,
        html: msg.body,
      }));
      await this.resend.batch.send(payload);
    } catch (err) {
      this.logger.error('Failed to send batch emails', err);
      throw err;
    }
  }
}
