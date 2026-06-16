import { Injectable } from '@nestjs/common';
import { AuthProvider, DeviceType, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class AuthRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ─── User Finders ────────────────────────────────────────────────────────────

  findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  findByNumber(phone_number: string) {
    return this.prisma.user.findUnique({ where: { phone_number } });
  }

  findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  findByGoogleId(googleId: string) {
    return this.prisma.user.findUnique({ where: { googleId } });
  }

  /**
   * Finds a user by email OR phone_number in a single query.
   * Used by the login endpoint where `identifier` may be either.
   */
  findByIdentifier(identifier: string) {
    return this.prisma.user.findFirst({
      where: {
        OR: [{ email: identifier }, { phone_number: identifier }],
      },
    });
  }

  // ─── User Mutations ───────────────────────────────────────────────────────────

  /**
   * Creates a PASSWORD provider user.
   * Kept aligned with existing `register` flow.
   */
  createPasswordUser(data: {
    name?: string;
    email: string;
    phone_number: string;
    password: string;
  }) {
    return this.prisma.user.create({
      data: {
        ...data,
        provider: AuthProvider.PASSWORD,
        isVerified: false,
      },
    });
  }

  /**
   * Upserts a GOOGLE provider user.
   * Called on every Google login — creates on first login, returns existing on subsequent.
   */
  upsertGoogleUser(data: {
    googleId: string;
    email: string;
    name?: string;
  }) {
    return this.prisma.user.upsert({
      where: { googleId: data.googleId },
      create: {
        googleId: data.googleId,
        email: data.email,
        name: data.name ?? null,
        provider: AuthProvider.GOOGLE,
        isVerified: true, // Google accounts are pre-verified
      },
      update: {}, // No fields updated on subsequent logins
    });
  }

  updateVerificationStatus(id: string, isVerified: boolean) {
    return this.prisma.user.update({
      where: { id },
      data: { isVerified },
    });
  }

  updatePassword(id: string, hashedPassword: string) {
    return this.prisma.user.update({
      where: { id },
      data: { password: hashedPassword },
    });
  }

  updatePhoneNumber(id: string, phone_number: string) {
    return this.prisma.user.update({
      where: { id },
      data: { phone_number, isVerified: true },
    });
  }

  // ─── Legacy ──────────────────────────────────────────────────────────────────

  /**
   * @deprecated Use createPasswordUser() for new code.
   * Kept for backward compatibility with any existing callers.
   */
  create(data: Prisma.UserCreateInput) {
    return this.prisma.user.create({ data });
  }

  // ─── Refresh Token ────────────────────────────────────────────────────────────

  /**
   * Persists a hashed refresh token record.
   * Called after successful login / OTP verify / Google login.
   */
  createRefreshToken(data: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
    userAgent?: string;
    ipAddress?: string;
    deviceName?: string;
    deviceType?: DeviceType;
  }) {
    return this.prisma.refreshToken.create({ data });
  }

  /**
   * Returns all non-revoked, non-expired tokens for a user.
   * Used during /auth/refresh to find the matching token record via bcrypt.
   */
  findActiveRefreshTokensByUser(userId: string) {
    return this.prisma.refreshToken.findMany({
      where: {
        userId,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
  }

  /**
   * Returns active session records with device info for the sessions listing.
   * Omits tokenHash — never exposed to the client.
   */
  findUserRefreshTokens(userId: string) {
    return this.prisma.refreshToken.findMany({
      where: {
        userId,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      select: {
        id: true,
        deviceName: true,
        deviceType: true,
        ipAddress: true,
        lastUsedAt: true,
        createdAt: true,
        expiresAt: true,
      },
      orderBy: { lastUsedAt: 'desc' },
    });
  }

  /**
   * Marks a single token as revoked (single-device logout / rotation).
   */
  revokeRefreshToken(id: string) {
    return this.prisma.refreshToken.update({
      where: { id },
      data: { revokedAt: new Date() },
    });
  }

  /**
   * Revokes ALL active refresh tokens for a user (logout from all devices).
   */
  revokeAllRefreshTokensForUser(userId: string) {
    return this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  /**
   * Stamps lastUsedAt on a token record.
   * Called on every successful /auth/refresh to track session recency.
   */
  updateRefreshTokenLastUsed(id: string) {
    return this.prisma.refreshToken.update({
      where: { id },
      data: { lastUsedAt: new Date() },
    });
  }

  /**
   * Deletes expired tokens and revoked tokens older than 30 days.
   * Called by the TokenCleanupService daily cron job.
   * Returns the count of deleted records.
   */
  async deleteExpiredAndRevokedTokens(): Promise<number> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const result = await this.prisma.refreshToken.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: new Date() } },
          { revokedAt: { lt: thirtyDaysAgo } },
        ],
      },
    });

    return result.count;
  }
}