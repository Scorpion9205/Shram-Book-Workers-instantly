import { describe, it, expect, vi, beforeEach } from "vitest";
import { NotificationDispatcher } from "../services/NotificationDispatcher.js";
import { NotificationType, NotificationChannel } from "../enums/NotificationType.js";

const { renderEmailMock } = vi.hoisted(() => ({
  renderEmailMock: vi.fn().mockResolvedValue("<html>built-in template</html>"),
}));
vi.mock("../../../shared/email/utils/render-email.js", () => ({
  renderEmail: renderEmailMock,
}));

describe("NotificationDispatcher — NOTIF-01 (DB templates must govern Email, not just SMS/Push)", () => {
  let templateRepoMock: any;
  let userRepoMock: any;
  let notificationRepoMock: any;
  let emailProviderMock: any;
  let smsProviderMock: any;
  let pushProviderMock: any;
  let cacheMock: any;
  let dispatcher: NotificationDispatcher;

  beforeEach(() => {
    renderEmailMock.mockClear();
    templateRepoMock = { findByTypeChannelLocale: vi.fn() };
    userRepoMock = { findById: vi.fn() };
    notificationRepoMock = { create: vi.fn() };
    emailProviderMock = { send: vi.fn() };
    smsProviderMock = { send: vi.fn() };
    pushProviderMock = { send: vi.fn(), sendMulticast: vi.fn() };
    cacheMock = { get: vi.fn().mockResolvedValue(null), set: vi.fn() };

    dispatcher = new NotificationDispatcher(
      templateRepoMock,
      userRepoMock,
      notificationRepoMock,
      emailProviderMock,
      smsProviderMock,
      pushProviderMock,
      cacheMock,
    );

    userRepoMock.findById.mockResolvedValue({ id: "user_1", email: "provider@example.com", name: "Test Provider" });
  });

  it("sends the Admin-edited DB template for Email when one is configured — the actual fix", async () => {
    templateRepoMock.findByTypeChannelLocale.mockResolvedValue({
      subject: "Custom subject for {{name}}",
      body: "Custom admin-edited body for {{name}}",
    });

    await dispatcher.dispatch({
      type: NotificationType.WELCOME,
      userId: "user_1",
      channels: [NotificationChannel.EMAIL],
      data: { name: "Test Provider" },
    });

    expect(emailProviderMock.send).toHaveBeenCalledWith(
      "provider@example.com",
      "Custom subject for Test Provider",
      "Custom admin-edited body for Test Provider",
    );
    // The DB template must win outright — the built-in React component must never even render.
    expect(renderEmailMock).not.toHaveBeenCalled();
  });

  it("falls back to the built-in React template only when no DB template is configured", async () => {
    templateRepoMock.findByTypeChannelLocale.mockResolvedValue(null);

    await dispatcher.dispatch({
      type: NotificationType.WELCOME,
      userId: "user_1",
      channels: [NotificationChannel.EMAIL],
      data: { name: "Test Provider" },
    });

    expect(renderEmailMock).toHaveBeenCalledTimes(1);
    expect(emailProviderMock.send).toHaveBeenCalledWith(
      "provider@example.com",
      expect.any(String),
      "<html>built-in template</html>",
    );
  });

  it("still uses the DB template for SMS as before (unaffected by this fix)", async () => {
    userRepoMock.findById.mockResolvedValue({ id: "user_1", phone: "9999999999", name: "Test Worker" });
    templateRepoMock.findByTypeChannelLocale.mockResolvedValue({
      body: "Your OTP is {{otp}}",
    });

    await dispatcher.dispatch({
      type: NotificationType.OTP_WORK_START,
      userId: "user_1",
      channels: [NotificationChannel.SMS],
      data: { otp: "123456" },
    });

    expect(smsProviderMock.send).toHaveBeenCalledWith("9999999999", "Your OTP is 123456");
  });

  it("throws (surfacing the failure) if the built-in fallback render fails and no DB template exists", async () => {
    templateRepoMock.findByTypeChannelLocale.mockResolvedValue(null);
    renderEmailMock.mockRejectedValueOnce(new Error("render crashed"));

    await expect(
      dispatcher.dispatch({
        type: NotificationType.WELCOME,
        userId: "user_1",
        channels: [NotificationChannel.EMAIL],
        data: { name: "Test Provider" },
      }),
    ).rejects.toThrow();
  });
});
