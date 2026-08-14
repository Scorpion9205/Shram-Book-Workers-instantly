import * as amqp from 'amqplib';
import { Router } from 'express';
import { PrismaService } from '../../database/prisma/PrismaService.js';
import type { ICacheService } from '../../core/interfaces/ICacheService.js';
import type { IEventPublisher } from '../../core/interfaces/IEventPublisher.js';
import { CacheService } from '../cache/CacheService.js';
import { RabbitMQEventPublisher } from '../queue/RabbitMQEventPublisher.js';
import { Logger } from '../../core/logger/Logger.js';
import { env } from '../../config/env.js';

// Module Imports
import { UserRepository, UserService, UserController, createUserRouter } from '../../modules/users/index.js';
import { WorkerRepository, WorkerService, WorkerController, createWorkerRouter } from '../../modules/workers/index.js';
import { JobRepository, ApplicationRepository, JobService, ApplicationService, JobController, createJobRouter } from '../../modules/jobs/index.js';
import { ReviewRepository, ReviewService, ReviewController, createReviewRouter } from '../../modules/reviews/index.js';
import { AgentRepository, AgentWorkerRepository, AgentService, AgentController, createAgentRouter } from '../../modules/agents/index.js';
import { PaymentRepository, RazorpayProvider, PaymentService, PaymentController, createPaymentRouter } from '../../modules/payments/index.js';
import { WalletRepository, TransactionRepository, WalletService, WalletController, createWalletRouter } from '../../modules/wallet/index.js';
import { AdminService, AdminController, createAdminRouter } from '../../modules/admin/index.js';
import { BookingRepository, BookingStatusHistoryRepository, BookingStateService } from '../../modules/bookings/index.js';

const logger = new Logger('AppBootstrap');

export interface AppDependencies {
  prisma: PrismaService;
  cache: ICacheService;
  eventPublisher: IEventPublisher;
  rabbitConn: amqp.Connection;
  
  // Dynamic Routers
  userRouter: Router;
  workerRouter: Router;
  jobRouter: Router;
  reviewRouter: Router;
  agentRouter: Router;
  paymentRouter: Router;
  walletRouter: Router;
  adminRouter: Router;
}

/**
 * Initializes and wires all application dependencies (manual Dependency Injection).
 * Acts as the single source of truth for object instantiation.
 */
export async function wireModules(
  prismaService: PrismaService,
  redisClient: any,
  rabbitConnection: amqp.Connection,
): Promise<AppDependencies> {
  logger.info('Wiring application modules and dependencies...');

  // 1. Core Infrastructure Classes
  const cacheService = new CacheService(redisClient);
  const eventPublisher = new RabbitMQEventPublisher(rabbitConnection);

  // Initialize event publisher
  await eventPublisher.init();

  // 2. Repositories
  const userRepo = new UserRepository(prismaService);
  const workerRepo = new WorkerRepository(prismaService);
  const jobRepo = new JobRepository(prismaService);
  const applicationRepo = new ApplicationRepository(prismaService);
  const reviewRepo = new ReviewRepository(prismaService);
  const agentRepo = new AgentRepository(prismaService);
  const agentWorkerRepo = new AgentWorkerRepository(prismaService);
  const paymentRepo = new PaymentRepository(prismaService);
  const walletRepo = new WalletRepository(prismaService);
  const transactionRepo = new TransactionRepository(prismaService);
  const bookingRepo = new BookingRepository(prismaService);
  const bookingHistoryRepo = new BookingStatusHistoryRepository(prismaService);

  // 3. Providers
  const razorpayProvider = new RazorpayProvider(env.RAZORPAY_KEY_ID!, env.RAZORPAY_KEY_SECRET!);

  // 4. Services
  const bookingStateService = new BookingStateService(
    bookingRepo,
    bookingHistoryRepo,
    eventPublisher,
    prismaService,
  );

  const userService = new UserService(userRepo, cacheService);
  const workerService = new WorkerService(workerRepo, cacheService);
  const jobService = new JobService(
    jobRepo,
    workerRepo,
    agentRepo,
    agentWorkerRepo,
    cacheService,
    prismaService,
  );
  const applicationService = new ApplicationService(
    applicationRepo,
    jobRepo,
    workerRepo,
    cacheService,
    prismaService,
  );
  const reviewService = new ReviewService(
    reviewRepo,
    bookingRepo,
    workerRepo,
    prismaService,
  );
  const agentService = new AgentService(
    agentRepo,
    agentWorkerRepo,
    prismaService,
  );
  const paymentService = new PaymentService(
    paymentRepo,
    bookingRepo,
    bookingStateService,
    razorpayProvider,
    prismaService,
  );
  const walletService = new WalletService(
    walletRepo,
    transactionRepo,
    workerRepo,
    prismaService,
  );
  const adminService = new AdminService(
    prismaService,
    cacheService,
  );

  // 5. Controllers
  const userController = new UserController(userService);
  const workerController = new WorkerController(workerService);
  const jobController = new JobController(jobService, applicationService);
  const reviewController = new ReviewController(reviewService);
  const agentController = new AgentController(agentService);
  const paymentController = new PaymentController(paymentService);
  const walletController = new WalletController(walletService);
  const adminController = new AdminController(adminService);

  // 6. Routers
  const userRouter = createUserRouter(userController);
  const workerRouter = createWorkerRouter(workerController);
  const jobRouter = createJobRouter(jobController);
  const reviewRouter = createReviewRouter(reviewController);
  const agentRouter = createAgentRouter(agentController);
  const paymentRouter = createPaymentRouter(paymentController);
  const walletRouter = createWalletRouter(walletController);
  const adminRouter = createAdminRouter(adminController);

  logger.info('Module wiring completed successfully');

  return {
    prisma: prismaService,
    cache: cacheService,
    eventPublisher,
    rabbitConn: rabbitConnection,
    userRouter,
    workerRouter,
    jobRouter,
    reviewRouter,
    agentRouter,
    paymentRouter,
    walletRouter,
    adminRouter,
  };
}
