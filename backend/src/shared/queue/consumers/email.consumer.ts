import type{ ConsumeMessage } from "amqplib";

import { rabbitMQ } from "../connection/rabbitmq.connection.js";

import { QUEUES } from "../constants/queue.js";

import { ResendProvider } from "../../email/providers/resend.provider.js";

import type{ EmailMessage } from "../types/email-message.types.js";

export class EmailConsumer {

  private static provider =
    new ResendProvider();

  static async consume() {

    const channel =
      rabbitMQ.getChannel();

    await channel.consume(

      QUEUES.EMAIL,

      async (

        message: ConsumeMessage | null

      ) => {

        if (!message) {

          return;

        }

        try {

          const payload: EmailMessage =

            JSON.parse(

              message.content.toString()

            );

          await this.provider.sendEmail({

            to: payload.to,

            subject: payload.subject,

            html: payload.html,

          });

          channel.ack(message);

          console.log(

            `✅ Email sent to ${payload.to}`

          );

        } catch (error) {

          console.error(

            "❌ Email Consumer Error:",

            error

          );

          channel.nack(

            message,

            false,

            true

          );

        }

      }

    );

    console.log(

      "📨 Email Consumer Started"

    );

  }

}