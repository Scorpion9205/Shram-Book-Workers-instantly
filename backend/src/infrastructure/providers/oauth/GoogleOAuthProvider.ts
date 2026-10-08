import { OAuth2Client } from "google-auth-library";
import { AuthenticationException } from "../../../core/exceptions/index.js";
import type { GoogleTokenPayload, IGoogleOAuthProvider } from "../../../core/interfaces/IProviders.js";

export class GoogleOAuthProvider implements IGoogleOAuthProvider {
  private readonly client: OAuth2Client;

  constructor(private readonly clientId: string | undefined) {
    this.client = new OAuth2Client(clientId);
  }

  async verifyIdToken(idToken: string): Promise<GoogleTokenPayload> {
    if (!this.clientId) {
      throw new AuthenticationException("Google login is not configured on this server");
    }

    let payload;
    try {
      const ticket = await this.client.verifyIdToken({
        idToken,
        audience: this.clientId,
      });
      payload = ticket.getPayload();
    } catch {
      throw new AuthenticationException("Invalid Google ID token");
    }

    if (!payload || !payload.email || !payload.sub) {
      throw new AuthenticationException("Invalid Google ID token payload");
    }

    if (!payload.email_verified) {
      throw new AuthenticationException("Google account email is not verified");
    }

    return {
      email: payload.email,
      sub: payload.sub,
      name: payload.name,
      emailVerified: payload.email_verified,
    };
  }
}
