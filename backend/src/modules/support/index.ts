export { SupportController } from './controllers/SupportController.js';
export { SupportService } from './services/SupportService.js';
export { SupportRepository } from './repositories/SupportRepository.js';
export { createSupportRouter } from './routes/support.routes.js';
export type { ISupportService, SupportTicketDto, SupportMessageDto } from './interfaces/ISupportService.js';
export type { ISupportRepository, CreateTicketData } from './interfaces/ISupportRepository.js';
