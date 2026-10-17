import type { Request, Response } from "express";
import { BaseController } from "../../../core/base/BaseController.js";
import type { IInstantRequestService } from "../interfaces/IInstantRequestService.js";
import type { ICacheService } from "../../../core/interfaces/ICacheService.js";
import { createInstantRequestSchema, calculateFareSchema } from "../validations/instant-request.validation.js";
import { FareService } from "../../../shared/services/pricing/fare.service.js";
import { randomUUID } from "crypto";
import { BadRequestException } from "../../../core/exceptions/index.js";

// HTTP layer for instant requests (provider creates/cancels, workers accept or bid).
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

    // The price is never taken from the client. The provider first calls calculate-fare, which
    // stores the quote (price + items) in the cache under a quoteId for 5 minutes; here we load
    // that quote and refuse to continue if it expired or doesn't match what's being requested.
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

    // Use the quoted price, ignoring any amount the client sent.
    const inputData = { ...data, amount: cachedQuote.fare };

    const request = await this.instantRequestService.createInstantRequest(user.userId, inputData);

    this.created(res, { request }, "Instant request created successfully");
  };

  // Worker: open requests near me that match my skills.
  getNearbyRequests = async (req: Request, res: Response): Promise<void> => {
    const user = (req as any).user;
    const requests = await this.instantRequestService.getNearbyRequests(user.userId);
    this.ok(res, { requests }, "Nearby requests retrieved successfully");
  };

  // Step 1 of posting a request: price it. Returns the fare breakdown and a quoteId that
  // createInstantRequest must send back within 5 minutes.
  calculateFare = async (req: Request, res: Response): Promise<void> => {
    const data = this.validate(calculateFareSchema, req.body);

    const fare = await this.instantRequestService.quoteFare(data.items);

    const quoteId = randomUUID();
    const ttlSeconds = 300; // 5 mins
    await this.cache.set(
      `quote:${quoteId}`,
      { fare: fare.total, items: data.items },
      ttlSeconds,
    );

    this.ok(
      res,
      {
        // Only the total is shown to the provider; the fee split is never exposed.
        estimatedFare: fare.total,
        quoteId,
      },
      "Fare calculated successfully",
    );
  };

  // Worker accepts one slot (item) of a direct request.
  acceptRequest = async (req: Request, res: Response): Promise<void> => {
    const user = (req as any).user;
    const itemId = req.params.itemId;

    if (!itemId || Array.isArray(itemId)) {
      throw new BadRequestException("Invalid item id");
    }

    const result = await this.instantRequestService.acceptRequest(user.userId, itemId);
    this.ok(res, result, "Instant request accepted successfully");
  };

  // Provider: my requests and who accepted them.
  getMyRequests = async (req: Request, res: Response): Promise<void> => {
    const user = (req as any).user;
    const requests = await this.instantRequestService.getMyRequests(user.userId);
    this.ok(res, { requests }, "My requests retrieved successfully");
  };

  // Worker places (or updates) a bid on a bidding-mode request.
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

  // Provider picks the winning bid.
  selectBid = async (req: Request, res: Response): Promise<void> => {
    const user = (req as any).user;
    const { id, bidId } = req.params;
    if (!id || !bidId || typeof id !== "string" || typeof bidId !== "string") {
      throw new BadRequestException("Invalid parameters");
    }
    const result = await this.instantRequestService.selectBid(user.userId, id, bidId);
    this.ok(res, result, "Bid selected successfully");
  };

  // Provider cancels their open request.
  cancelRequest = async (req: Request, res: Response): Promise<void> => {
    const user = (req as any).user;
    const { id } = req.params;
    if (!id || typeof id !== "string") {
      throw new BadRequestException("Invalid request parameter");
    }
    await this.instantRequestService.cancelRequest(user.userId, id);
    this.ok(res, null, "Instant request cancelled successfully");
  };
}
