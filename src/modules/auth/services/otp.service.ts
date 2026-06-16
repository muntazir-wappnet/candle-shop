import { Injectable } from '@nestjs/common';
import { RedisService } from '../../../redis/redis.service';
import crypto from 'crypto';
import * as bcrypt from 'bcrypt';
import {
  OTP_EXPIRY_SECONDS,
  OTP_MAX_ATTEMPTS,
  OTP_RESEND_LIMIT,
  OTP_RESEND_WINDOW,
} from '../constants/otp.constants';
import { OtpPurpose } from '../enums/otp-purpose.enum';

@Injectable()
export class OtpService {
  constructor(private readonly redisService: RedisService) {}

  generateOtp(): string {
    return crypto.randomInt(100000, 999999).toString();
  }

  // ─── Key builders ────────────────────────────────────────────────────────────

  private otpKey(userId: string, purpose: OtpPurpose): string {
    return `otp:verify:${purpose}:${userId}`;
  }

  private attemptsKey(userId: string, purpose: OtpPurpose): string {
    return `otp:attempts:${purpose}:${userId}`;
  }

  private resendKey(userId: string): string {
    return `otp:resend:${userId}`;
  }

  // ─── Core OTP operations ─────────────────────────────────────────────────────

  async storeOtp(
    userId: string,
    otp: string,
    purpose: OtpPurpose = OtpPurpose.SIGNUP,
  ): Promise<void> {
    const hash = await bcrypt.hash(otp, 10);
    await this.redisService.set(
      this.otpKey(userId, purpose),
      hash,
      OTP_EXPIRY_SECONDS,
    );
  }

  async verifyOtp(
    userId: string,
    otp: string,
    purpose: OtpPurpose = OtpPurpose.SIGNUP,
  ): Promise<boolean> {
    const storedHash = await this.redisService.get(
      this.otpKey(userId, purpose),
    );

    if (!storedHash) return false;

    return bcrypt.compare(otp, storedHash);
  }

  async deleteOtp(
    userId: string,
    purpose: OtpPurpose = OtpPurpose.SIGNUP,
  ): Promise<void> {
    await this.redisService.del(this.otpKey(userId, purpose));
  }

  // ─── Attempt tracking ────────────────────────────────────────────────────────

  async getAttempts(
    userId: string,
    purpose: OtpPurpose = OtpPurpose.SIGNUP,
  ): Promise<number> {
    const attempts = await this.redisService.get(
      this.attemptsKey(userId, purpose),
    );
    return Number(attempts ?? 0);
  }

  async incrementAttempts(
    userId: string,
    purpose: OtpPurpose = OtpPurpose.SIGNUP,
  ): Promise<number> {
    const key = this.attemptsKey(userId, purpose);
    const attempts = await this.redisService.increment(key);
    await this.redisService.expire(key, OTP_EXPIRY_SECONDS);
    return attempts;
  }

  async hasExceededAttempts(
    userId: string,
    purpose: OtpPurpose = OtpPurpose.SIGNUP,
  ): Promise<boolean> {
    const attempts = await this.getAttempts(userId, purpose);
    return attempts >= OTP_MAX_ATTEMPTS;
  }

  async clearAttempts(
    userId: string,
    purpose: OtpPurpose = OtpPurpose.SIGNUP,
  ): Promise<void> {
    await this.redisService.del(this.attemptsKey(userId, purpose));
  }

  // ─── Resend rate-limiting ────────────────────────────────────────────────────

  async trackResendRequest(userId: string): Promise<number> {
    const key = this.resendKey(userId);
    const count = await this.redisService.increment(key);

    if (count === 1) {
      await this.redisService.expire(key, OTP_RESEND_WINDOW);
    }

    return count;
  }

  async canResendOtp(userId: string): Promise<boolean> {
    const count = Number(
      await this.redisService.get(this.resendKey(userId)),
    );
    return count < OTP_RESEND_LIMIT;
  }
}
