import cron from "node-cron";
import { InstantRequestRepository } from "../../modules/instant-requests/repositories/InstantRequestRepository.js";
import { getIO } from "../../socket/socket.js";

const instantRequestRepo = new InstantRequestRepository();

export const startExpireInstantRequestsJob = () => {
  cron.schedule("*/1 * * * *", async () => {
    try {
      const expiredRequests = await instantRequestRepo.findExpiredOpenRequests();

      if (expiredRequests.length === 0) {
        return;
      }

      const expiredIds = expiredRequests.map((req) => req.id);
      await instantRequestRepo.markExpired(expiredIds);

      try {
        const io = getIO();
        for (const request of expiredRequests) {
          io.emit("request_expired", {
            requestId: request.id,
          });
        }
      } catch (socketError) {
        // Socket.IO may not be initialized in non-socket worker processes; log warning safely
        console.warn("Socket notification skipped in expire job: Socket.IO not available");
      }

      console.log(`${expiredRequests.length} instant requests marked as expired`);
    } catch (error) {
      console.error("Expire Request Job Error:", error);
    }
  });

  console.log("Expire Instant Requests Job Started");
};