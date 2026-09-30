export interface IInstantMatchingService {
  startMatching(requestId: string): Promise<void>;
}
