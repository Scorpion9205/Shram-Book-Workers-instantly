import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { IStorageProvider } from '../../../core/interfaces/IProviders.js';
import { Logger } from '../../../core/logger/Logger.js';
import { BusinessException } from '../../../core/exceptions/index.js';

export class S3Provider implements IStorageProvider {
  private readonly logger = new Logger('S3Provider');
  private readonly client: S3Client;
  private readonly bucketName: string;

  private static _instance: S3Provider | null = null;

  static setInstance(instance: S3Provider) {
    this._instance = instance;
  }

  static async signUrl(url: string | null | undefined, expirySeconds: number = 604800): Promise<string | null | undefined> {
    if (url && url.includes('.amazonaws.com/')) {
      if (url.includes('?X-Amz-') || url.includes('&X-Amz-')) {
        return url;
      }
      try {
        const key = url.split('.com/')[1];
        if (key && this._instance) {
          return await this._instance.getSignedUrl(key, expirySeconds);
        }
      } catch (err) {
        console.error('Failed to sign S3 URL:', url, err);
      }
    }
    return url;
  }

  static async signUrlsInObject(obj: any): Promise<any> {
    if (!obj || typeof obj !== 'object') {
      return obj;
    }

    if (Array.isArray(obj)) {
      await Promise.all(obj.map(item => this.signUrlsInObject(item)));
      return obj;
    }

    for (const key of Object.keys(obj)) {
      const val = obj[key];
      if ((key === 'profileImage' || key === 'profileImg' || key === 'avatarUrl') && typeof val === 'string' && val.includes('.amazonaws.com/')) {
        obj[key] = await this.signUrl(val);
      } else if (val && typeof val === 'object') {
        await this.signUrlsInObject(val);
      }
    }

    return obj;
  }

  constructor(
    bucketName?: string,
    region: string = 'ap-south-1',
    accessKeyId?: string,
    secretAccessKey?: string,
  ) {
    this.logger.info(`S3Provider Initializing: bucketName=${bucketName}, region=${region}, hasAccessKey=${!!accessKeyId}, hasSecretAccessKey=${!!secretAccessKey}`);

    if (!bucketName || !accessKeyId || !secretAccessKey) {
      throw new Error('AWS S3 configurations are incomplete. Missing bucketName, accessKeyId, or secretAccessKey.');
    }

    this.bucketName = bucketName;
    this.client = new S3Client({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }

  async upload(key: string, buffer: Buffer, contentType: string): Promise<string> {
    this.logger.info(`Uploading file to S3: ${key}`);

    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      });

      await this.client.send(command);
      return `https://${this.bucketName}.s3.amazonaws.com/${key}`;
    } catch (err: any) {
      this.logger.error(`Failed to upload file to S3: ${key}`, err);
      throw new BusinessException(
        'S3_UPLOAD_ERROR',
        `S3 upload failed: ${err.message || String(err)}. Check bucket '${this.bucketName}' and credentials.`
      );
    }
  }

  async getSignedUrl(key: string, expirySeconds: number = 3600): Promise<string> {
    this.logger.info(`Generating signed URL for S3 key: ${key}`);

    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      return await getSignedUrl(this.client, command, { expiresIn: expirySeconds });
    } catch (err) {
      this.logger.error(`Failed to generate signed URL for S3 key: ${key}`, err);
      throw err;
    }
  }

  async delete(key: string): Promise<void> {
    this.logger.info(`Deleting file from S3: ${key}`);

    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      await this.client.send(command);
    } catch (err) {
      this.logger.error(`Failed to delete file from S3: ${key}`, err);
      throw err;
    }
  }
}
