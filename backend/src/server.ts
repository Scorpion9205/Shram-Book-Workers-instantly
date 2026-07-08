import http from "http";
import dotenv from "dotenv"
dotenv.config();
import "./shared/config/redis.js"

import app from "./app.js";
import { startExpireInstantRequestsJob } from "./shared/jobs/expire-instant-requests.job.js";
import { rabbitMQ } from "./shared/queue/connection/rabbitmq.connection.js";
import { EmailConsumer } from "./shared/queue/consumers/email.consumer.js";

import {
  initializeSocket,
} from "./socket/socket.js";

const PORT =
  process.env.PORT || 5000;

const server =
  http.createServer(app);

initializeSocket(server);

await rabbitMQ.connect();
await EmailConsumer.consume();
server.listen(PORT, () => {

  console.log(
    `Server running on port ${PORT}`
  );
  startExpireInstantRequestsJob();

});
