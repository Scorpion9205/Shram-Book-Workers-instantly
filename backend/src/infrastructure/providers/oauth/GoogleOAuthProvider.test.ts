import { describe, it, expect, vi } from "vitest";
import { AuthenticationException } from "../../../core/exceptions/index.js";

const verifyIdTokenMock = vi.fn();
vi.mock("google-auth-library", () => ({
  OAuth2Client: class {
    verifyIdToken = verifyIdTokenMock;
  },
}));

const { GoogleOAuthProvider } = await import("./GoogleOAuthProvider.js");

describe("GoogleOAuthProvider", () => {
  it("throws if GOOGLE_CLIENT_ID is not configured, without ever calling Google", async () => {
    const provider = new GoogleOAuthProvider(undefined);
    await expect(provider.verifyIdToken("some-token")).rejects.toThrow(AuthenticationException);
    expect(verifyIdTokenMock).not.toHaveBeenCalled();
  });

  it("returns the verified payload on a valid token", async () => {
    verifyIdTokenMock.mockResolvedValue({
      getPayload: () => ({
        email: "worker@example.com",
        sub: "google-sub-123",
        name: "Test Worker",
        email_verified: true,
      }),
    });

    const provider = new GoogleOAuthProvider("client-id-123");
    const result = await provider.verifyIdToken("valid-token");

    expect(result).toEqual({
      email: "worker@example.com",
      sub: "google-sub-123",
      name: "Test Worker",
      emailVerified: true,
    });
  });

  it("rejects a token whose signature verification fails (this is the actual security fix — a forged/tampered token must never reach the account-creation path)", async () => {
    verifyIdTokenMock.mockRejectedValue(new Error("Invalid token signature"));

    const provider = new GoogleOAuthProvider("client-id-123");
    await expect(provider.verifyIdToken("forged-token")).rejects.toThrow(AuthenticationException);
  });

  it("rejects an unverified email even if the signature is otherwise valid", async () => {
    verifyIdTokenMock.mockResolvedValue({
      getPayload: () => ({
        email: "unverified@example.com",
        sub: "google-sub-456",
        email_verified: false,
      }),
    });

    const provider = new GoogleOAuthProvider("client-id-123");
    await expect(provider.verifyIdToken("token")).rejects.toThrow(AuthenticationException);
  });
});
