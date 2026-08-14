export interface IReviewService {
  createReview(bookingId: string, providerId: string, data: any): Promise<any>;
  getWorkerRating(workerId: string): Promise<any>;
  getWorkerReviews(workerId: string): Promise<any>;
  getProviderReviews(providerId: string): Promise<any[]>;
}
