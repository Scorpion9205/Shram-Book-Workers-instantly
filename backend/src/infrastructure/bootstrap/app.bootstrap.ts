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
import { AdminService, AdminController, AdminRepository, createAdminRouter } from '../../modules/admin/index.js';
import { BookingRepository, BookingStatusHistoryRepository, BookingStateService, BookingService, BookingController, createBookingRouter } from '../../modules/bookings/index.js';
import { PlatformSettingRepository } from '../../modules/platform-settings/index.js';
import {
  InstantRequestRepository,
  InstantMatchingService,
  InstantRequestService,
  InstantRequestController,
  createInstantRequestRouter,
} from '../../modules/instant-requests/index.js';
import {
  AuthRepository,
  OTPRepository,
  AuthService,
  OTPService,
  TokenService,
  AuthController,
  createAuthRouter,
} from '../../modules/auth/index.js';
import { LocationRepository, LocationService, LocationController, createLocationRouter } from '../../modules/location/index.js';
import { SkillRepository, SkillService, SkillController, createSkillRouter } from '../../modules/skills/index.js';
import { ProviderRepository, ProviderService, ProviderController, createProviderRouter } from '../../modules/providers/index.js';
import { DashboardRepository, DashboardService, DashboardController, createDashboardRouter } from '../../modules/dashboard/index.js';
import {
  PricingController,
  FareCalculator,
  BaseRateStrategy,
  DistanceStrategy,
  DemandStrategy,
  WeatherStrategy,
  DurationStrategy,
  SkillRepository as PricingSkillRepository,
  MapsProvider,
  createPricingRouter,
} from '../../modules/pricing/index.js';

import { ChatRepository, ChatService, ChatController, createChatRouter } from '../../modules/chat/index.js';
import { CategoryRepository, CategoryService, CategoryController, createCategoryRouter } from '../../modules/categories/index.js';
import { SupportRepository, SupportService, SupportController, createSupportRouter } from '../../modules/support/index.js';
import { PricingRuleRepository } from '../../modules/pricing-rules/index.js';

// Notifications Module Imports
import {
  NotificationTemplateRepository,
  NotificationRepository,
  NotificationDispatcher,
  NotificationController,
  createNotificationRouter,
} from '../../modules/notifications/index.js';

// Infrastructure Providers
import { ResendProvider } from '../providers/email/ResendProvider.js';
import { ExotelProvider } from '../providers/sms/ExotelProvider.js';
import { FirebaseProvider } from '../providers/push/FirebaseProvider.js';
import { S3Provider } from '../providers/storage/S3Provider.js';
import { GoogleOAuthProvider } from '../providers/oauth/GoogleOAuthProvider.js';

// Queue Consumers
import { NotificationConsumer } from '../queue/consumers/NotificationConsumer.js';
import { WalletConsumer } from '../queue/consumers/WalletConsumer.js';
import { CleanupConsumer } from '../queue/consumers/CleanupConsumer.js';

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
  notificationRouter: Router;
  bookingRouter: Router;
  instantRequestRouter: Router;
  authRouter: Router;
  locationRouter: Router;
  skillRouter: Router;
  providerRouter: Router;
  dashboardRouter: Router;
  pricingRouter: Router;
  chatRouter: Router;
  categoryRouter: Router;
  supportRouter: Router;
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
  const notificationTemplateRepo = new NotificationTemplateRepository(prismaService);
  const notificationRepo = new NotificationRepository(prismaService);
  const platformSettingRepo = new PlatformSettingRepository(prismaService);
  const adminRepo = new AdminRepository(prismaService);
  const instantRequestRepo = new InstantRequestRepository(prismaService);
  const authRepo = new AuthRepository(prismaService);
  const otpRepo = new OTPRepository(prismaService);
  const locationRepo = new LocationRepository(prismaService);
  const skillRepo = new SkillRepository(prismaService);
  const providerRepo = new ProviderRepository(prismaService);
  const dashboardRepo = new DashboardRepository(prismaService);
  const pricingSkillRepo = new PricingSkillRepository(prismaService);
  const chatRepo = new ChatRepository(prismaService);
  const categoryRepo = new CategoryRepository(prismaService);
  const supportRepo = new SupportRepository(prismaService);
  const pricingRuleRepo = new PricingRuleRepository(prismaService);

  // 3. Providers
  const razorpayProvider = new RazorpayProvider(env.RAZORPAY_KEY_ID!, env.RAZORPAY_KEY_SECRET!);
  const emailProvider = new ResendProvider(env.RESEND_API_KEY, env.EMAIL_FROM);
  const smsProvider = new ExotelProvider(env.EXOTEL_API_KEY, env.EXOTEL_API_TOKEN, env.EXOTEL_SID, env.EXOTEL_FROM);
  const pushProvider = new FirebaseProvider(env.FIREBASE_SERVICE_ACCOUNT);
  const s3Provider = new S3Provider(env.AWS_S3_BUCKET, env.AWS_REGION, env.AWS_ACCESS_KEY_ID, env.AWS_SECRET_ACCESS_KEY);
  S3Provider.setInstance(s3Provider);
  const mapsProvider = new MapsProvider();
  const googleOAuthProvider = new GoogleOAuthProvider(env.GOOGLE_CLIENT_ID);

  // 4. Services
  const bookingStateService = new BookingStateService(
    bookingRepo,
    bookingHistoryRepo,
    eventPublisher,
    prismaService,
  );

  const userService = new UserService(userRepo, cacheService, s3Provider);
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
    eventPublisher,
    bookingHistoryRepo,
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
    platformSettingRepo,
    cacheService,
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
  );
  const adminService = new AdminService(
    adminRepo,
    cacheService,
    userRepo,
    bookingRepo,
    platformSettingRepo,
    notificationTemplateRepo,
    workerRepo,
    bookingStateService,
    pricingRuleRepo,
  );
  const notificationDispatcher = new NotificationDispatcher(
    notificationTemplateRepo,
    userRepo,
    notificationRepo,
    emailProvider,
    smsProvider,
    pushProvider,
    cacheService,
  );
  const bookingService = new BookingService(
    bookingRepo,
    bookingStateService,
    eventPublisher,
    cacheService,
    jobRepo,
  );
  const instantMatchingService = new InstantMatchingService(
    instantRequestRepo,
    cacheService,
    platformSettingRepo,
  );
  const instantRequestService = new InstantRequestService(
    instantRequestRepo,
    cacheService,
    prismaService,
    instantMatchingService,
    bookingHistoryRepo,
  );
  const tokenService = new TokenService(cacheService);
  const otpService = new OTPService(otpRepo, cacheService, emailProvider, smsProvider);
  const authService = new AuthService(authRepo, otpService, tokenService, cacheService, prismaService, emailProvider, smsProvider, googleOAuthProvider);
  const locationService = new LocationService(locationRepo, cacheService);
  const skillService = new SkillService(skillRepo);
  const providerService = new ProviderService(providerRepo);
  const dashboardService = new DashboardService(dashboardRepo, cacheService);
  const chatService = new ChatService(chatRepo, bookingRepo, userRepo);
  const categoryService = new CategoryService(categoryRepo);
  const supportService = new SupportService(supportRepo, userRepo);

  const baseRateStrategy = new BaseRateStrategy(pricingSkillRepo);
  const distanceStrategy = new DistanceStrategy(mapsProvider, cacheService, platformSettingRepo);
  const demandStrategy = new DemandStrategy(cacheService, platformSettingRepo);
  const weatherStrategy = new WeatherStrategy(cacheService, platformSettingRepo);
  const durationStrategy = new DurationStrategy();
  const fareCalculator = new FareCalculator(
    baseRateStrategy,
    distanceStrategy,
    demandStrategy,
    weatherStrategy,
    durationStrategy,
    platformSettingRepo,
    cacheService,
    pricingRuleRepo,
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
  const notificationController = new NotificationController(notificationRepo);
  const bookingController = new BookingController(bookingService, reviewService, cacheService);
  const instantRequestController = new InstantRequestController(instantRequestService, cacheService);
  const authController = new AuthController(authService, cacheService);
  const locationController = new LocationController(locationService);
  const skillController = new SkillController(skillService);
  const providerController = new ProviderController(providerService);
  const dashboardController = new DashboardController(dashboardService);
  const chatController = new ChatController(chatService);
  const categoryController = new CategoryController(categoryService);
  const supportController = new SupportController(supportService);
  const pricingController = new PricingController(fareCalculator);

  // 6. Routers
  const userRouter = createUserRouter(userController);
  const workerRouter = createWorkerRouter(workerController);
  const jobRouter = createJobRouter(jobController);
  const reviewRouter = createReviewRouter(reviewController);
  const agentRouter = createAgentRouter(agentController);
  const paymentRouter = createPaymentRouter(paymentController);
  const walletRouter = createWalletRouter(walletController);
  const adminRouter = createAdminRouter(adminController);
  const notificationRouter = createNotificationRouter(notificationController);
  const bookingRouter = createBookingRouter(bookingController);
  const instantRequestRouter = createInstantRequestRouter(instantRequestController);
  const authRouter = createAuthRouter(authController);
  const locationRouter = createLocationRouter(locationController);
  const skillRouter = createSkillRouter(skillController);
  const providerRouter = createProviderRouter(providerController);
  const dashboardRouter = createDashboardRouter(dashboardController);
  const chatRouter = createChatRouter(chatController);
  const categoryRouter = createCategoryRouter(categoryController);
  const supportRouter = createSupportRouter(supportController);
  const pricingRouter = createPricingRouter(pricingController);

  // 7. Start Queue Consumers
  try {
    const channel = await (rabbitConnection as any).createChannel();
    
    const notificationConsumer = new NotificationConsumer(channel, notificationDispatcher);
    await notificationConsumer.start();
    
    const walletConsumer = new WalletConsumer(channel, walletService, bookingRepo, bookingStateService, platformSettingRepo, cacheService);
    await walletConsumer.start();
    
    const cleanupConsumer = new CleanupConsumer(channel, prismaService);
    await cleanupConsumer.start();
    
    logger.info('All background queue consumers started successfully');
  } catch (err) {
    logger.error('Failed to start queue consumers', err);
    throw err;
  }

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
    notificationRouter,
    bookingRouter,
    instantRequestRouter,
    authRouter,
    locationRouter,
    skillRouter,
    providerRouter,
    dashboardRouter,
    pricingRouter,
    chatRouter,
    categoryRouter,
    supportRouter,
  };
}
