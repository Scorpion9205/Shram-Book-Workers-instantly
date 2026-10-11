export interface IInstantMatchingService {
  startMatching(requestId: string): Promise<void>;
  /**
   * Re-launches startMatching() for every still-OPEN request — call once at server startup so
   * a deploy/restart doesn't silently orphan a request that was mid-search (its previous
   * in-memory loop died with the old process, but the request itself is still legitimately
   * open and nothing else will ever resume matching it otherwise).
   */
  resumeAllOpenRequests(): Promise<void>;
}
