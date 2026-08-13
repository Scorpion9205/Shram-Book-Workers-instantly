import { Router } from 'express';
import { BookingController } from '../controllers/BookingController.js';
import { BookingService } from '../services/BookingService.js';
import { BookingStateService } from '../services/BookingStateService.js';
import { BookingRepository } from '../repositories/BookingRepository.js';
import { BookingStatusHistoryRepository } from '../repositories/BookingStatusHistoryRepository.js';
import { PrismaService } from '../../../database/prisma/PrismaService.js';
import { authenticate } from '../../auth/middleware/authenticate.middleware.js';

// Manual dependency resolution fallback
const prisma = PrismaService.getInstance();
const bookingRepo = new BookingRepository(prisma);
const historyRepo = new BookingStatusHistoryRepository(prisma);
const eventPublisher = (global as any).deps?.eventPublisher || {
  publish: async (key: string, payload: any) => console.log(`[Event Mock] Publish: ${key}`, payload),
};

const stateService = new BookingStateService(bookingRepo, historyRepo, eventPublisher, prisma);
const bookingService = new BookingService(bookingRepo, stateService);
const controller = new BookingController(bookingService);

const router = Router();

// Secure all booking endpoints with JWT authentication
router.use(authenticate);

router.get('/', controller.getBookings);
router.get('/:id', controller.getBookingById);
router.post('/', controller.createBooking);
router.patch('/:id/cancel', controller.cancelBooking);

export default router;
