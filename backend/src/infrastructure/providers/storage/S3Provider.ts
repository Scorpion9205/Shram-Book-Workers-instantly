import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { IStorageProvider } from '../../../core/interfaces/IProviders.js';
import { Logger } from '../../../core/logger/Logger.js';

export class S3Provider implements IStorageProvider {
  private readonly logger = new Logger('S3Provider');
  private readonly client: S3Client | null = null;

  constructor(
    private readonly bucketName?: string,
    region: string = 'ap-south-1',
    accessKeyId?: string,
    secretAccessKey?: string,
  ) {
    if (!bucketName || !accessKeyId || !secretAccessKey) {
      this.logger.warn('AWS S3 configurations are incomplete. Storage operations will be mocked.');
      return;
    }

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
    if (!this.client || !this.bucketName) {
      this.logger.info(`[MOCK STORAGE UPLOAD] Key: ${key}, Size: ${buffer.length} bytes`);
      return `https://mock-s3-bucket.s3.amazonaws.com/${key}`;
    }

    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      });

      await this.client.send(command);
      return `https://${this.bucketName}.s3.amazonaws.com/${key}`;
    } catch (err) {
      this.logger.error(`Failed to upload file to S3: ${key}`, err);
      throw err;
    }
  }

  async getSignedUrl(key: string, expirySeconds: number = 3600): Promise<string> {
    this.logger.info(`Generating signed URL for S3 key: ${key}`);
    if (!this.client || !this.bucketName) {
      this.logger.info(`[MOCK STORAGE SIGNED URL] Key: ${key}, Expiry: ${expirySeconds}s`);
      return `https://mock-s3-bucket.s3.amazonaws.com/${key}?mock-signature=true`;
    }

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
    if (!this.client || !this.bucketName) {
      this.logger.info(`[MOCK STORAGE DELETE] Key: ${key}`);
      return;
    }

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
