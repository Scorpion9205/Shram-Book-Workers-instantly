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

        this.channel =
            await this.connection.createChannel();

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

        await this.channel.assertQueue(
            QUEUES.NOTIFICATION,
            {
                durable: true,
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