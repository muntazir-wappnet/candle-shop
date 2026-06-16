import { Injectable, Logger, HttpStatus } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { DeviceType } from '@prisma/client';
import { AuthRepository } from '../repositories/auth.repository';
import { AppException } from '../../../common/exceptions/app.exception';
import { hashPassword, comparePassword } from '../helpers/password.helper';
import { DeviceInfo } from '../helpers/device-info.helper';

// ─── Refresh Token Payload ────────────────────────────────────────────────────

export interface RefreshTokenPayload {
  sub: string; // userId
}

// ─── Service ──────────────────────────────────────────────────────────────────

/**
 * Handles all refresh-token lifecycle operations:
 * - Token generation (access + refresh JWTs)
 * - Secure hashed storage in the database
 * - Token rotation (revoke old, create new)
 * - Token revocation (single & bulk)
 * - Session lookup
 *
 * Kept separate from AuthService to maintain Single Responsibility.
 * AuthService delegates all token concerns here.
 */
@Injectable()
export class TokenService {
  private readonly logger = new Logger(TokenService.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly authRepository: AuthRepository,
  ) {}

  // ─── Access Token ────────────────────────────────────────────────────────────

  /**
   * Signs a short-lived access token (JWT_SECRET, JWT_EXPIRES_IN).
   * Payload: { sub: userId, email }
   */
  generateAccessToken(userId: string, email: string | null): string {
    return this.jwtService.sign(
      { sub: userId, email },
      {
        secret: this.configService.get<string>('JWT_SECRET'),
        expiresIn: this.configService.get<string>('JWT_EXPIRES_IN', '15m') as any,
      },
    );
  }

  // ─── Refresh Token ───────────────────────────────────────────────────────────

  /**
   * Signs a long-lived refresh token (REFRESH_TOKEN_SECRET, REFRESH_TOKEN_EXPIRES_IN).
   * Payload: { sub: userId }  — minimal payload by design.
   */
  generateRefreshToken(userId: string): string {
    return this.jwtService.sign(
      { sub: userId },
      {
        secret: this.configService.get<string>('REFRESH_TOKEN_SECRET'),
        expiresIn: this.configService.get<string>(
          'REFRESH_TOKEN_EXPIRES_IN',
          '30d',
        ) as any,
      },
    );
  }

  /**
   * Verifies a refresh token JWT.
   * Throws 401 AppException if expired, tampered, or signed with wrong secret.
   */
  verifyRefreshToken(token: string): RefreshTokenPayload {
    try {
      return this.jwtService.verify<RefreshTokenPayload>(token, {
        secret: this.configService.get<string>('REFRESH_TOKEN_SECRET'),
      });
    } catch {
      throw new AppException(
        'Invalid or expired refresh token',
        HttpStatus.UNAUTHORIZED,
      );
    }
  }

  // ─── Storage ─────────────────────────────────────────────────────────────────

  /**
   * Hashes a raw refresh token with bcrypt and persists the record.
   * NEVER stores the raw token — only the hash.
   */
  async storeRefreshToken(
    userId: string,
    rawToken: string,
    deviceInfo: DeviceInfo,
  ): Promise<void> {
    const tokenHash = await hashPassword(rawToken);

    // Compute expiry from env — parse "30d" → days → ms
    const expiresInStr = this.configService.get<string>(
      'REFRESH_TOKEN_EXPIRES_IN',
      '30d',
    );
    const expiresAt = this.parseExpiry(expiresInStr);

    await this.authRepository.createRefreshToken({
      userId,
      tokenHash,
      expiresAt,
      userAgent: deviceInfo.userAgent ?? undefined,
      ipAddress: deviceInfo.ipAddress ?? undefined,
      deviceName: deviceInfo.deviceName ?? undefined,
      deviceType: deviceInfo.deviceType as DeviceType,
    });

    this.logger.log(
      `[TokenService] Stored refresh token for user ${userId} — device: ${deviceInfo.deviceName}`,
    );
  }

  /**
   * Finds the active token record that matches a raw token via bcrypt comparison.
   * Returns null if no match found (token doesn't exist, revoked, or expired).
   */
  async findValidTokenRecord(userId: string, rawToken: string) {
    const activeTokens =
      await this.authRepository.findActiveRefreshTokensByUser(userId);

    for (const record of activeTokens) {
      const isMatch = await comparePassword(rawToken, record.tokenHash);
      if (isMatch) {
        return record;
      }
    }

    return null;
  }

  /**
   * Implements Refresh Token Rotation:
   * 1. Revokes the old token record
   * 2. Creates a new token record with the new hash
   *
   * Uses separate DB operations (not a transaction) — acceptable because:
   * - Revoke is idempotent
   * - If store fails, old token is still revoked (safe failure mode)
   */
  async rotateRefreshToken(
    userId: string,
    oldTokenId: string,
    newRawToken: string,
    deviceInfo: DeviceInfo,
  ): Promise<void> {
    await this.authRepository.revokeRefreshToken(oldTokenId);
    await this.storeRefreshToken(userId, newRawToken, deviceInfo);

    this.logger.log(
      `[TokenService] Rotated refresh token for user ${userId} (old: ${oldTokenId})`,
    );
  }

  // ─── Revocation ──────────────────────────────────────────────────────────────

  /**
   * Revokes a single token by ID (single-device logout).
   */
  async revokeToken(tokenId: string): Promise<void> {
    await this.authRepository.revokeRefreshToken(tokenId);
  }

  /**
   * Revokes ALL active refresh tokens for a user (logout from all devices).
   */
  async revokeAllForUser(userId: string): Promise<void> {
    await this.authRepository.revokeAllRefreshTokensForUser(userId);
    this.logger.log(
      `[TokenService] Revoked all refresh tokens for user ${userId}`,
    );
  }

  /**
   * Stamps lastUsedAt on the token record to track session recency.
   */
  async updateLastUsed(tokenId: string): Promise<void> {
    await this.authRepository.updateRefreshTokenLastUsed(tokenId);
  }

  // ─── Cookie Options ──────────────────────────────────────────────────────────

  /**
   * Returns cookie options based on NODE_ENV.
   * secure=true in production forces HTTPS-only transmission.
   */
  getCookieOptions(): Record<string, unknown> {
    const isProduction = process.env.NODE_ENV === 'production';
    return {
      httpOnly: true,     // JS cannot access — prevents XSS token theft
      secure: isProduction, // HTTPS only in production
      sameSite: 'strict' as const, // CSRF protection
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days in ms
    };
  }

  // ─── Private Helpers ─────────────────────────────────────────────────────────

  /**
   * Converts a JWT expiry string like "30d", "15m", "7d" into a future Date.
   */
  private parseExpiry(expiresIn: string): Date {
    const unit = expiresIn.slice(-1);
    const value = parseInt(expiresIn.slice(0, -1), 10);

    const ms =
      unit === 'd' ? value * 24 * 60 * 60 * 1000 :
      unit === 'h' ? value * 60 * 60 * 1000 :
      unit === 'm' ? value * 60 * 1000 :
      unit === 's' ? value * 1000 :
      30 * 24 * 60 * 60 * 1000; // fallback: 30 days

    return new Date(Date.now() + ms);
  }
}
