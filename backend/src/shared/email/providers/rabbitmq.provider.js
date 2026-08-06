import { rabbitMQ } from "../../queue/connection/rabbitmq.connection.js";
import { EXCHANGES } from "../../queue/constants/exchanges.js";
import { ROUTING_KEYS } from "../../queue/constants/routingKeys.js";
export class RabbitMQProvider {
    async sendEmail(data) {
        const channel = rabbitMQ.getChannel();
        channel.publish(EXCHANGES.APP, ROUTING_KEYS.EMAIL_SEND, Buffer.from(JSON.stringify(data)), {
            persistent: true,
        });
        console.log(`📨 Email queued for ${data.to}`);
    }
}
//# sourceMappingURL=rabbitmq.provider.js.map