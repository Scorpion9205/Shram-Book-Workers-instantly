import { Router } from 'express';
import { PricingController } from '../controllers/PricingController.js';
import { FareCalculator } from '../services/FareCalculator.js';
import { BaseRateStrategy } from '../strategies/BaseRateStrategy.js';
import { DistanceStrategy } from '../strategies/DistanceStrategy.js';
import { DemandStrategy } from '../strategies/DemandStrategy.js';
import { WeatherStrategy } from '../strategies/WeatherStrategy.js';
import { DurationStrategy } from '../strategies/DurationStrategy.js';
import { SkillRepository } from '../repositories/SkillRepository.js';
import { MapsProvider } from '../providers/MapsProvider.js';
import { PlatformSettingRepository } from '../../platform-settings/repositories/PlatformSettingRepository.js';
import { PrismaService } from '../../../database/prisma/PrismaService.js';
import { CacheService } from '../../../infrastructure/cache/CacheService.js';
import { redis } from '../../../shared/config/redis.js';
import { authenticate } from '../../auth/middleware/authenticate.middleware.js';

// Dependency wiring fallback
const prisma = PrismaService.getInstance();
const cache = (global as any).deps?.cache || new CacheService(redis);

const skillRepo = new SkillRepository(prisma);
const settingRepo = new PlatformSettingRepository(prisma);
const mapsProvider = new MapsProvider();

// Strategy instantiations
const baseRateStrategy = new BaseRateStrategy(skillRepo);
const distanceStrategy = new DistanceStrategy(mapsProvider, cache, settingRepo);
const demandStrategy = new DemandStrategy(cache, settingRepo);
const weatherStrategy = new WeatherStrategy(cache, settingRepo);
const durationStrategy = new DurationStrategy();

const fareCalculator = new FareCalculator(
  baseRateStrategy,
  distanceStrategy,
  demandStrategy,
  weatherStrategy,
  durationStrategy,
  settingRepo,
  cache,
);

const controller = new PricingController(fareCalculator);

const router = Router();

// Secure pricing endpoint with JWT check
router.get('/estimate', authenticate, controller.getEstimate);

export default router;
