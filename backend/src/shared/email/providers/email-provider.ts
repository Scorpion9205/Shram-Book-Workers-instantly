import type{ EmailOptions } from "../types/email.types.js";

export interface EmailProvider {

  sendEmail(
    options: EmailOptions
  ): Promise<void>;

}