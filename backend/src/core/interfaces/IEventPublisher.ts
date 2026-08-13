/** Published domain event payload */
export interface DomainEvent<T = unknown> {
  routingKey: string;
  payload: T;
  _meta?: {
    publishedAt: string;
    correlationId?: string;
  };
}

/**
 * Contract for publishing domain events to the message broker.
 * Implementations: RabbitMQEventPublisher
 */
export interface IEventPublisher {
  publish(routingKey: string, payload: object): Promise<void>;
}
