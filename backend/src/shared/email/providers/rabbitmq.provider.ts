import type { EmailProvider } from "./email-provider.js";

import { rabbitMQ } from "../../queue/connection/rabbitmq.connection.js";

import { EXCHANGES } from "../../queue/constants/exchanges.js";

import { ROUTING_KEYS } from "../../queue/constants/routingKeys.js";

import type{ EmailMessage } from "../../queue/types/email-message.types.js";

export class RabbitMQProvider
  implements EmailProvider {

  async sendEmail(
    data: EmailMessage
  ): Promise<void> {

    const channel =
      rabbitMQ.getChannel();

    channel.publish(

      EXCHANGES.APP,

      ROUTING_KEYS.EMAIL_SEND,

      Buffer.from(
        JSON.stringify(data)
      ),

      {
        persistent: true,
      }

    );

    console.log(
      `📨 Email queued for ${data.to}`
    );

  }

}