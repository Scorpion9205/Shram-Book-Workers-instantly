import amqp from "amqplib";
declare class RabbitMQConnection {
    private connection;
    private channel;
    connect(): Promise<void>;
    getChannel(): amqp.Channel;
}
export declare const rabbitMQ: RabbitMQConnection;
export {};
//# sourceMappingURL=rabbitmq.connection.d.ts.map