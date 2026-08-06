import { rabbitMQ } from "../../queue/connection/rabbitmq.connection.js";
import { QUEUES } from "../../queue/constants/queue.js";
import { ResendProvider } from "../../email/providers/resend.provider.js";
const resendProvider = new ResendProvider();
export async function startEmailConsumer() {
    const channel = rabbitMQ.getChannel();
    console.log("📩 CONSUMER RECEIVED");
    channel.consume(QUEUES.EMAIL, async (message) => {
        if (!message)
            return;
        try {
            const email = JSON.parse(message.content.toString());
            await resendProvider.sendEmail(email);
            console.log("🚀 SENDING VIA RESEND");
            console.log(`✅ Email sent to ${email.to}`);
            channel.ack(message);
        }
        catch (err) {
            console.error("❌ Email Consumer Error", err);
            channel.nack(message, false, false);
        }
    }, {
        noAck: false,
    });
}
//# sourceMappingURL=email.consumer.js.map