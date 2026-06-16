import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AuthRepository } from '../repositories/auth.repository';

/**
 * Runs a scheduled job once per day at midnight to purge:
 * - Expired refresh tokens (expiresAt < NOW)
 * - Revoked tokens older than 30 days (revokedAt < 30 days ago)
 *
 * Keeps the RefreshToken table lean and improves query performance
 * on the @@index([userId]) index used during token validation.
 */
@Injectable()
export class TokenCleanupService {
  private readonly logger = new Logger(TokenCleanupService.name);

  constructor(private readonly authRepository: AuthRepository) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async cleanupExpiredTokens(): Promise<void> {
    this.logger.log('[TokenCleanup] Running scheduled cleanup of expired/revoked tokens');

    const deleted = await this.authRepository.deleteExpiredAndRevokedTokens();

    this.logger.log(`[TokenCleanup] Deleted ${deleted} stale refresh token(s)`);
  }
}
