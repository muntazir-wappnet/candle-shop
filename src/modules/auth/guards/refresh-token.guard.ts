import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Guard that validates the HttpOnly refresh_token cookie.
 * Uses the 'jwt-refresh' Passport strategy (RefreshTokenStrategy).
 *
 * Apply this to:
 * - POST /auth/refresh   → generate new token pair
 * - POST /auth/logout    → revoke the current session
 */
@Injectable()
export class RefreshTokenGuard extends AuthGuard('jwt-refresh') {}
