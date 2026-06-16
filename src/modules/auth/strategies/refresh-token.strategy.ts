import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

export interface RefreshTokenPayloadWithRaw {
  sub: string;
  refreshToken: string; // raw token — needed by AuthService for bcrypt comparison
}

/**
 * Passport strategy for the HttpOnly refresh token cookie.
 *
 * Strategy name: 'jwt-refresh'  → used by RefreshTokenGuard
 *
 * Extraction flow:
 *   1. cookie-parser middleware populates req.cookies on every request
 *   2. This strategy reads req.cookies['refresh_token']
 *   3. Verifies the JWT signature using REFRESH_TOKEN_SECRET
 *   4. Returns { sub, refreshToken } attached to req.user
 *
 * The raw token is attached alongside the payload so that AuthService
 * can bcrypt-compare it against the stored hash in the DB.
 */
@Injectable()
export class RefreshTokenStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(configService: ConfigService) {
    super({
      // Extract JWT from the HttpOnly cookie set at login
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => req?.cookies?.['refresh_token'] ?? null,
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('REFRESH_TOKEN_SECRET')!,
      // Pass the raw request so we can attach the raw token to the payload
      passReqToCallback: true,
    });
  }

  /**
   * Called automatically by Passport after token signature is verified.
   * Returns value is attached to req.user.
   */
  validate(
    req: Request,
    payload: { sub: string },
  ): RefreshTokenPayloadWithRaw {
    const rawToken: string = req.cookies['refresh_token'];
    return { sub: payload.sub, refreshToken: rawToken };
  }
}
