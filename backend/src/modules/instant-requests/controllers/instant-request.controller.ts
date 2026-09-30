import type { Request, Response } from "express";
import { BaseController } from "../../../core/base/BaseController.js";
import type { IInstantRequestService } from "../interfaces/IInstantRequestService.js";
import type { ICacheService } from "../../../core/interfaces/ICacheService.js";
import { createInstantRequestSchema, calculateFareSchema } from "../validations/instant-request.validation.js";
import { FareService } from "../../../shared/services/pricing/fare.service.js";
import { randomUUID } from "crypto";
import { BadRequestException } from "../../../core/exceptions/index.js";

export class InstantRequestController extends BaseController {
  constructor(
    private readonly instantRequestService: IInstantRequestService,
    private readonly cache: ICacheService,
  ) {
    super();
  }

  createInstantRequest = async (req: Request, res: Response): Promise<void> => {
    const user = (req as any).user;
    const data = this.validate(createInstantRequestSchema, req.body);

    // Secure Quote Validation
    const cachedQuote = await this.cache.get<{ fare: number; items: any[] }>(`quote:${data.quoteId}`);
    if (!cachedQuote) {
      throw new BadRequestException("Quote has expired or is invalid. Please request a new quote.");
    }

    const itemsMatch =
      data.items.every((item) =>
        cachedQuote.items.some(
          (cachedItem: any) => cachedItem.skillId === item.skillId && cachedItem.requiredWorkers === item.requiredWorkers,
        ),
      ) && data.items.length === cachedQuote.items.length;

    if (!itemsMatch) {
      throw new BadRequestException("Request parameters do not match the generated quote.");
    }

    // Overwrite request amount with secure cached quote price
    const inputData = { ...data, amount: cachedQuote.fare };

    const request = await this.instantRequestService.createInstantRequest(user.userId, inputData);

    this.created(res, { request }, "Instant request created successfully");
  };

  getNearbyRequests = async (req: Request, res: Response): Promise<void> => {
    const user = (req as any).user;
    const requests = await this.instantRequestService.getNearbyRequests(user.userId);
    this.ok(res, { requests }, "Nearby requests retrieved successfully");
  };

  calculateFare = async (req: Request, res: Response): Promise<void> => {
    const data = this.validate(calculateFareSchema, req.body);

    const fare = await FareService.calculateInstantFare(data.items);

    const quoteId = randomUUID();
    const ttlSeconds = 300; // 5 mins
    await this.cache.set(
      `quote:${quoteId}`,
      JSON.stringify({ fare: fare.total, items: data.items }),
      ttlSeconds,
    );

    this.ok(
      res,
      {
        estimatedFare: fare.total,
        subtotal: fare.subtotal,
        platformFee: fare.platformFee,
        quoteId,
      },
      "Fare calculated successfully",
    );
  };

  acceptRequest = async (req: Request, res: Response): Promise<void> => {
    const user = (req as any).user;
    const itemId = req.params.itemId;

    if (!itemId || Array.isArray(itemId)) {
      throw new BadRequestException("Invalid item id");
    }

    const result = await this.instantRequestService.acceptRequest(user.userId, itemId);
    this.ok(res, result, "Instant request accepted successfully");
  };

  getMyRequests = async (req: Request, res: Response): Promise<void> => {
    const user = (req as any).user;
    const requests = await this.instantRequestService.getMyRequests(user.userId);
    this.ok(res, { requests }, "My requests retrieved successfully");
  };

  submitBid = async (req: Request, res: Response): Promise<void> => {
    const user = (req as any).user;
    const { id } = req.params;
    const { bidAmount } = req.body;
    if (!id || typeof id !== "string") {
      throw new BadRequestException("Invalid request parameter");
    }
    const bid = await this.instantRequestService.submitBid(user.userId, id, Number(bidAmount));
    this.ok(res, { bid }, "Bid submitted successfully");
  };

  selectBid = async (req: Request, res: Response): Promise<void> => {
    const user = (req as any).user;
    const { id, bidId } = req.params;
    if (!id || !bidId || typeof id !== "string" || typeof bidId !== "string") {
      throw new BadRequestException("Invalid parameters");
    }
    const result = await this.instantRequestService.selectBid(user.userId, id, bidId);
    this.ok(res, result, "Bid selected successfully");
  };
}
