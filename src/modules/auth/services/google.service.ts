import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';
import { AppException } from '../../../common/exceptions/app.exception';
import { HttpStatus } from '@nestjs/common';

export interface GooglePayload {
  sub: string;
  email: string;
  name?: string;
}

@Injectable()
export class GoogleService {
  private readonly logger = new Logger(GoogleService.name);
  private readonly client: OAuth2Client;
  private readonly clientId: string;

  constructor(private readonly configService: ConfigService) {
    this.clientId =
      this.configService.get<string>('GOOGLE_CLIENT_ID') ?? '';
    this.client = new OAuth2Client(this.clientId);
  }

  /**
   * Verifies a Google ID token and returns the extracted payload.
   * Throws a 401 AppException when the token is invalid or expired.
   */
  async verifyIdToken(idToken: string): Promise<GooglePayload> {
    try {
      const ticket = await this.client.verifyIdToken({
        idToken,
        audience: this.clientId,
      });

      const payload = ticket.getPayload();

      if (!payload || !payload.sub || !payload.email) {
        throw new Error('Incomplete Google token payload');
      }

      return {
        sub: payload.sub,
        email: payload.email,
        name: payload.name,
      };
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Unknown error';

      this.logger.warn(`[Google] Token verification failed: ${message}`);

      throw new AppException(
        'Invalid or expired Google token',
        HttpStatus.UNAUTHORIZED,
      );
    }
  }
}
