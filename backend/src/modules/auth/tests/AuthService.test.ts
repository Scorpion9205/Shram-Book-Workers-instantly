import { describe, it, expect, vi, beforeEach } from "vitest";
import argon2 from "argon2";
import { AuthService } from "../services/AuthService.js";
import { OTPChannel, OTPPurpose } from "../enums/index.js";
import { UserRole } from "../../../core/enums/Role.js";
import {
  AuthenticationException,
  AuthorizationException,
  BusinessException,
} from "../../../core/exceptions/index.js";

describe("AuthService", () => {
  let userRepoMock: any;
  let otpServiceMock: any;
  let tokenServiceMock: any;
  let cacheMock: any;
  let prismaMock: any;
  let emailProviderMock: any;
  let smsProviderMock: any;
  let service: AuthService;

  beforeEach(() => {
    userRepoMock = {
      findByPhone: vi.fn(),
      findByEmail: vi.fn(),
      findById: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    };

    otpServiceMock = {
      request: vi.fn().mockResolvedValue(undefined),
      verify: vi.fn().mockResolvedValue(undefined),
    };

    tokenServiceMock = {
      generateAccessToken: vi.fn().mockReturnValue("mock_access_token"),
      generateRefreshToken: vi.fn().mockReturnValue("mock_refresh_token"),
      storeRefreshToken: vi.fn().mockResolvedValue(undefined),
      verifyRefreshToken: vi.fn().mockResolvedValue(true),
      revokeRefreshToken: vi.fn().mockResolvedValue(undefined),
    };

    cacheMock = {
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue(undefined),
      del: vi.fn().mockResolvedValue(undefined),
    };

    prismaMock = {
      client: {
        otp: { create: vi.fn().mockResolvedValue({}) },
      },
      transaction: vi.fn().mockImplementation(async (cb) => {
        return cb({
          providerProfile: { create: vi.fn() },
          workerProfile: { create: vi.fn() },
          agentProfile: { create: vi.fn() },
        });
      }),
    };

    emailProviderMock = {
      send: vi.fn().mockResolvedValue(true),
    };

    smsProviderMock = {
      send: vi.fn().mockResolvedValue(true),
    };

    service = new AuthService(
      userRepoMock,
      otpServiceMock,
      tokenServiceMock,
      cacheMock,
      prismaMock,
      emailProviderMock,
      smsProviderMock
    );
  });

  describe("requestOTP", () => {
    it("should request OTP successfully for an existing registered user", async () => {
      userRepoMock.findByPhone.mockResolvedValue({
        id: "user_1",
        phone: "+919876543210",
        role: UserRole.PROVIDER,
      });

      await service.requestOTP(OTPChannel.SMS, "+919876543210");

      expect(cacheMock.set).toHaveBeenCalledWith("signup:role:+919876543210", UserRole.PROVIDER, 600);
      expect(otpServiceMock.request).toHaveBeenCalledWith({
        channel: OTPChannel.SMS,
        identifier: "+919876543210",
        purpose: OTPPurpose.LOGIN,
      });
    });

    it("should throw AuthenticationException if unregistered user attempts login without role", async () => {
      userRepoMock.findByPhone.mockResolvedValue(null);

      await expect(service.requestOTP(OTPChannel.SMS, "+919999999999")).rejects.toThrow(
        AuthenticationException
      );
    });

    it("should throw AuthorizationException if role is not PROVIDER, WORKER, or AGENT", async () => {
      await expect(
        service.requestOTP(OTPChannel.SMS, "+919876543210", UserRole.ADMIN)
      ).rejects.toThrow(AuthorizationException);
    });
  });

  describe("verifyOTP", () => {
    it("should issue access and refresh tokens for an existing user on valid OTP", async () => {
      const user = { id: "user_1", role: UserRole.WORKER, phone: "+919876543210" };
      userRepoMock.findByPhone.mockResolvedValue(user);

      const result = await service.verifyOTP(OTPChannel.SMS, "+919876543210", "123456");

      expect(otpServiceMock.verify).toHaveBeenCalledWith({
        channel: OTPChannel.SMS,
        identifier: "+919876543210",
        purpose: OTPPurpose.LOGIN,
        code: "123456",
      });
      expect(tokenServiceMock.generateAccessToken).toHaveBeenCalledWith("user_1", UserRole.WORKER);
      expect(tokenServiceMock.generateRefreshToken).toHaveBeenCalledWith("user_1");
      expect(tokenServiceMock.storeRefreshToken).toHaveBeenCalledWith("user_1", "mock_refresh_token");
      expect(result).toEqual({
        user,
        accessToken: "mock_access_token",
        refreshToken: "mock_refresh_token",
      });
    });

    it("should reject and propagate error when OTP verification fails", async () => {
      otpServiceMock.verify.mockRejectedValue(
        new AuthenticationException("Invalid or expired OTP code")
      );

      await expect(service.verifyOTP(OTPChannel.SMS, "+919876543210", "000000")).rejects.toThrow(
        AuthenticationException
      );
    });
  });

  describe("adminLogin", () => {
    it("should reject when admin user is not found", async () => {
      userRepoMock.findByEmail.mockResolvedValue(null);

      await expect(service.adminLogin("admin@shram.com", "secret123")).rejects.toThrow(
        AuthenticationException
      );
    });

    it("should reject when user does not have ADMIN role", async () => {
      userRepoMock.findByEmail.mockResolvedValue({
        id: "user_prov",
        email: "prov@shram.com",
        role: UserRole.PROVIDER,
      });

      await expect(service.adminLogin("prov@shram.com", "secret123")).rejects.toThrow(
        AuthorizationException
      );
    });

    it("should authenticate and issue tokens when password matches", async () => {
      const passwordHash = await argon2.hash("validPassword123");
      const adminUser = {
        id: "admin_1",
        email: "admin@shram.com",
        role: UserRole.ADMIN,
        passwordHash,
      };
      userRepoMock.findByEmail.mockResolvedValue(adminUser);

      const result = await service.adminLogin("admin@shram.com", "validPassword123");

      expect(result.accessToken).toBe("mock_access_token");
      expect(result.refreshToken).toBe("mock_refresh_token");
      expect(result.user).toEqual(adminUser);
    });
  });

  describe("logout", () => {
    it("should revoke refresh token on logout", async () => {
      await service.logout("user_123");

      expect(tokenServiceMock.revokeRefreshToken).toHaveBeenCalledWith("user_123");
    });
  });
});
