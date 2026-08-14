import type { Request, Response } from 'express';
import { BaseController } from '../../../core/base/BaseController.js';
import type { IPaymentService } from '../interfaces/IPaymentService.js';
import { CreateOrderSchema } from '../dto/CreateOrder.dto.js';
import { BusinessException } from '../../../core/exceptions/index.js';

export class PaymentController extends BaseController {
  constructor(private readonly paymentService: IPaymentService) {
    super();
  }

  createOrder = async (req: Request, res: Response): Promise<void> => {
    const user = (req as any).user;
    const dto = await this.validate(CreateOrderSchema, req.body);
    const result = await this.paymentService.createOrder(dto.bookingId, user.userId);
    this.created(res, result, 'Payment order created successfully');
  };

  handleWebhook = async (req: Request, res: Response): Promise<void> => {
    const signature = req.headers['x-razorpay-signature'] as string;
    if (!signature) {
      throw new BusinessException('MISSING_SIGNATURE', 'Missing Razorpay signature header');
    }
    await this.paymentService.handleWebhook(req.body, signature);
    this.ok(res, { received: true }, 'Webhook processed successfully');
  };
}
