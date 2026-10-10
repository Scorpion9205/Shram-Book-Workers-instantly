import amqp from "amqplib";
import type { Channel, ChannelModel } from "amqplib";
import { EXCHANGES } from "../constants/exchanges.js";
import { QUEUES } from "../constants/queue.js";
import { ROUTING_KEYS } from "../constants/routingKeys.js";

class RabbitMQConnection {

    private connection: ChannelModel | null =
        null;

    private channel: Channel | null =
        null;

    async connect() {

        if (
            this.connection &&
            this.channel
        ) {
            return;
        }

        this.connection =
            await amqp.connect(
                process.env.RABBITMQ_URL!
            );

        // A channel-level error (e.g. deleteQueue 404ing below) closes the channel and emits
        // 'error' asynchronously — without a listener, that crashes the whole process even
        // though the rejected promise is already caught where it's awaited.
        this.connection.on("error", () => {});

        this.channel =
            await this.connection.createChannel();
        this.channel.on("error", () => {});

        await this.channel.assertExchange(
            EXCHANGES.APP,
            "topic",
            {
                durable: true,
            }
        );

        await this.channel.assertQueue(
            QUEUES.EMAIL,
            {
                durable: true,
            }
        );

        await this.channel.assertQueue(
            QUEUES.SMS,
            {
                durable: true,
            }
        );

        try {
            await this.channel.deleteQueue(QUEUES.NOTIFICATION);
        } catch (err) {
            // Deleting a queue that doesn't exist (e.g. a fresh broker) 404s and kills the
            // channel above — open a fresh one before continuing instead of reusing a dead one.
            this.channel = await this.connection.createChannel();
            this.channel.on("error", () => {});
        }

        await this.channel.assertQueue(
            QUEUES.NOTIFICATION,
            {
                durable: true,
                arguments: {
                    "x-dead-letter-exchange": "shram.dlx",
                },
            }
        );

        await this.channel.assertQueue(
            QUEUES.PAYMENT,
            {
                durable: true,
            }
        );

        await this.channel.bindQueue(
            QUEUES.EMAIL,
            EXCHANGES.APP,
            ROUTING_KEYS.EMAIL_SEND
        );

        await this.channel.bindQueue(
            QUEUES.SMS,
            EXCHANGES.APP,
            ROUTING_KEYS.SMS_SEND
        );

        await this.channel.bindQueue(
            QUEUES.NOTIFICATION,
            EXCHANGES.APP,
            ROUTING_KEYS.NOTIFICATION_PUSH
        );

        await this.channel.bindQueue(
            QUEUES.PAYMENT,
            EXCHANGES.APP,
            ROUTING_KEYS.PAYMENT_SUCCESS
        );

        console.log("RabbitMQ Connected");
        console.log("Exchange Created");
        console.log("Queues Initialized");

    }

    getChannel() {

        if (!this.channel) {

            throw new Error(
                "RabbitMQ channel not initialized"
            );

        }

        return this.channel;

    }

}

export const rabbitMQ =
    new RabbitMQConnection();