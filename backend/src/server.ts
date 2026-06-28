import http from "http";
import dotenv from "dotenv"
dotenv.config();
import "./shared/config/redis.js"

import app from "./app.js";
import { startExpireInstantRequestsJob } from "./shared/jobs/expire-instant-requests.job.js";

import {
  initializeSocket,
} from "./socket/socket.js";

const PORT =
  process.env.PORT || 5000;

const server =
  http.createServer(app);

initializeSocket(server);

server.listen(PORT, () => {

  console.log(
    `Server running on port ${PORT}`
  );
  // startExpireInstantRequestsJob();

});
console.log(process.env.REDIS_PORT);
