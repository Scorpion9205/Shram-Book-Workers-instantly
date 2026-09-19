import { describe, it, expect, vi, beforeEach } from "vitest";
import { OTPService } from "../services/OTPService.js";
import { OTPChannel, OTPPurpose } from "../enums/index.js";
import { BusinessException, TooManyRequestsException } from "../../../core/exceptions/index.js";
import argon2 from "argon2";

describe("OTPService", () => {
  let otpRepoMock: any;
  let cacheMock: any;
  let emailProviderMock: any;
  let smsProviderMock: any;
  let service: OTPService;

  beforeEach(() => {
    otpRepoMock = {
      invalidatePrevious: vi.fn().mockResolvedValue(undefined),
      create: vi.fn().mockResolvedValue(undefined),
      findActiveOTP: vi.fn(),
      incrementAttempts: vi.fn().mockResolvedValue(undefined),
      markConsumed: vi.fn().mockResolvedValue(undefined),
    };
    cacheMock = {
      get: vi.fn().mockResolvedValue(0),
      incr: vi.fn().mockResolvedValue(1),
    };
    emailProviderMock = {
      send: vi.fn().mockResolvedValue(undefined),
    };
    smsProviderMock = {
      send: vi.fn().mockResolvedValue(undefined),
    };

    service = new OTPService(
      otpRepoMock,
      cacheMock,
      emailProviderMock,
      smsProviderMock
    );
  });

  it("should request an OTP successfully via SMS channel", async () => {
    await service.request({
      identifier: "+919876543210",
      channel: OTPChannel.SMS,
      purpose: OTPPurpose.LOGIN,
    });

    expect(cacheMock.get).toHaveBeenCalled();
    expect(otpRepoMock.invalidatePrevious).toHaveBeenCalledWith("+919876543210", OTPPurpose.LOGIN);
    expect(otpRepoMock.create).toHaveBeenCalled();
    expect(smsProviderMock.send).toHaveBeenCalled();
  });

  it("should enforce rate limiting if max requests per hour exceeded", async () => {
    cacheMock.get.mockResolvedValue(15); // > MAX_PER_HOUR (5)

    await expect(
      service.request({
        identifier: "+919876543210",
        channel: OTPChannel.SMS,
        purpose: OTPPurpose.LOGIN,
      })
    ).rejects.toThrow(TooManyRequestsException);

    expect(otpRepoMock.create).not.toHaveBeenCalled();
  });

  it("should verify a valid OTP code correctly", async () => {
    const code = "123456";
    const codeHash = await argon2.hash(code, { type: argon2.argon2id });

    otpRepoMock.findActiveOTP.mockResolvedValue({
      id: "otp_1",
      codeHash,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      attempts: 0,
    });

    const isValid = await service.verify({
      identifier: "+919876543210",
      channel: OTPChannel.SMS,
      purpose: OTPPurpose.LOGIN,
      code: "123456",
    });

    expect(isValid).toBe(true);
    expect(otpRepoMock.markConsumed).toHaveBeenCalledWith("otp_1");
  });

  it("should reject an incorrect OTP code and increment attempts", async () => {
    const codeHash = await argon2.hash("123456", { type: argon2.argon2id });

    otpRepoMock.findActiveOTP.mockResolvedValue({
      id: "otp_1",
      codeHash,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      attempts: 0,
    });

    await expect(
      service.verify({
        identifier: "+919876543210",
        channel: OTPChannel.SMS,
        purpose: OTPPurpose.LOGIN,
        code: "999999",
      })
    ).rejects.toThrow(BusinessException);

    expect(otpRepoMock.incrementAttempts).toHaveBeenCalledWith("otp_1");
    expect(otpRepoMock.markConsumed).not.toHaveBeenCalled();
  });

  it("should reject an expired OTP code", async () => {
    otpRepoMock.findActiveOTP.mockResolvedValue({
      id: "otp_expired",
      codeHash: "hash",
      expiresAt: new Date(Date.now() - 60 * 1000), // in the past
      attempts: 0,
    });

    await expect(
      service.verify({
        identifier: "+919876543210",
        channel: OTPChannel.SMS,
        purpose: OTPPurpose.LOGIN,
        code: "123456",
      })
    ).rejects.toThrow(BusinessException);
  });
});
