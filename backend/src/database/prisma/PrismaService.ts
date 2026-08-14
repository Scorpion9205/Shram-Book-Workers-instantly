import type { Prisma } from '@prisma/client';
import prisma from '../../shared/config/prisma.js';
import { Logger } from '../../core/logger/Logger.js';

const logger = new Logger('PrismaService');

/**
 * Singleton PrismaClient with $transaction helper.
 * All repositories receive this service via DI — never instantiate PrismaClient directly.
 */
export class PrismaService {
  private static _instance: PrismaService;
  readonly client = prisma;

  private constructor() {}

  static getInstance(): PrismaService {
    if (!PrismaService._instance) {
      PrismaService._instance = new PrismaService();
    }
    return PrismaService._instance;
  }

  /**
   * Runs multiple operations in a single Prisma transaction.
   * Use this in services that need atomicity across multiple repositories.
   */
  async transaction<T>(
    fn: (tx: Prisma.TransactionClient) => Promise<T>,
    options?: { timeout?: number; maxWait?: number },
  ): Promise<T> {
    return this.client.$transaction(fn, {
      timeout: options?.timeout ?? 10000,
      maxWait: options?.maxWait ?? 5000,
    });
  }

  async connect(): Promise<void> {
    await this.client.$connect();
    logger.info('Database connected');
  }

  async disconnect(): Promise<void> {
    await this.client.$disconnect();
    logger.info('Database disconnected');
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.client.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }
}
