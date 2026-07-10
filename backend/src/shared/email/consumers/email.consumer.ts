import type{ ConsumeMessage } from "amqplib";

import { rabbitMQ } from "../../queue/connection/rabbitmq.connection.js";

import { QUEUES } from "../../queue/constants/queue.js";
import { ResendProvider } from "../../email/providers/resend.provider.js";

import type { EmailMessage } from "../../queue/types/email-message.types.js";

const resendProvider = new ResendProvider();

export async function startEmailConsumer() {

    const channel = rabbitMQ.getChannel();

    console.log("📩 CONSUMER RECEIVED");

    channel.consume(

        QUEUES.EMAIL,

        async (message: ConsumeMessage | null) => {

            if (!message) return;

            try {

                const email: EmailMessage =
                    JSON.parse(
                        message.content.toString()
                    );
                
                await resendProvider.sendEmail(email);
               console.log("🚀 SENDING VIA RESEND");
                console.log(
                    `✅ Email sent to ${email.to}`
                );

                channel.ack(message);

            } catch (err) {

                console.error(
                    "❌ Email Consumer Error",
                    err
                );

                channel.nack(
                    message,
                    false,
                    false
                );

            }

        },

        {
            noAck: false,
        }

    );

}