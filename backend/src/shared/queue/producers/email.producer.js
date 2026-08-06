import { rabbitMQ } from "../connection/rabbitmq.connection.js";
import { EXCHANGES } from "../constants/exchanges.js";
import { ROUTING_KEYS } from "../constants/routingKeys.js";
export class EmailProducer {
    static async publish(payload) {
        const channel = rabbitMQ.getChannel();
        channel.publish(EXCHANGES.APP, ROUTING_KEYS.EMAIL_SEND, Buffer.from(JSON.stringify(payload)), {
            persistent: true,
        });
        console.log("📨 Email queued");
    }
}
//# sourceMappingURL=email.producer.js.map