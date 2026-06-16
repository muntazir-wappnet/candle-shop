import { Injectable, Logger, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { $Enums } from '@prisma/client';
import { randomUUID } from 'crypto';
import { AuthRepository } from '../repositories/auth.repository';
import { RegisterDto } from '../dto/register.dto';
import { LoginDto } from '../dto/login.dto';
import { VerifyOtpDto } from '../dto/verify-otp.dto';
import { ResendOtpDto } from '../dto/resend-otp.dto';
import { ForgotPasswordDto } from '../dto/forgot-password.dto';
import { ResetPasswordDto } from '../dto/reset-password.dto';
import { GoogleLoginDto } from '../dto/google-login.dto';
import { LinkPhoneDto } from '../dto/link-phone.dto';
import { ChangePasswordDto } from '../dto/change-password.dto';
import { OtpService } from './otp.service';
import { GoogleService } from './google.service';
import { TokenService } from './token.service';
import { AppException } from '../../../common/exceptions/app.exception';
import { ApiResponseDto } from '../../../common/dto/api-response.dto';
import { NotificationService } from '../../notification/services/notification.service';
import type { LoginNotificationData } from '../../notification/services/notification.service';
import { NotificationChannel } from '../../notification/constants/notification.constants';
import { OtpPurpose } from '../enums/otp-purpose.enum';
import { OtpTemplateType } from '../../notification/enums/otp-template-type.enum';
import { RedisService } from '../../../redis/redis.service';
import { hashPassword, comparePassword } from '../helpers/password.helper';
import { DeviceInfo } from '../helpers/device-info.helper';

const PASSWORD_RESET_TTL = 600; // 10 minutes

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly authRepository: AuthRepository,
    private readonly otpService: OtpService,
    private readonly notificationService: NotificationService,
    private readonly tokenService: TokenService,
    private readonly googleService: GoogleService,
    private readonly redisService: RedisService,
  ) {}

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  private buildUserPayload(user: {
    id: string;
    name: string | null;
    email: string | null;
    phone_number: string | null;
    role: string;
    isVerified: boolean;
    provider: $Enums.AuthProvider;
  }) {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone_number: user.phone_number,
      role: user.role,
      isVerified: user.isVerified,
      provider: user.provider,
    };
  }

  /**
   * Issues tokens, stores hashed refresh token, sets HttpOnly cookie.
   * Extracted to avoid duplication across login / verifyOtp / googleLogin.
   */
  private async issueTokenPair(
    user: { id: string; email: string | null; phone_number?: string | null },
    response: Response,
    deviceInfo: DeviceInfo,
  ): Promise<{ accessToken: string }> {
    const accessToken = this.tokenService.generateAccessToken(
      user.id,
      user.email,
    );
    const refreshToken = this.tokenService.generateRefreshToken(user.id);

    await this.tokenService.storeRefreshToken(user.id, refreshToken, deviceInfo);

    response.cookie(
      'refresh_token',
      refreshToken,
      this.tokenService.getCookieOptions(),
    );

    // Fire new login notification non-blocking — failure must never block the login response
    const notificationData: LoginNotificationData = {
      deviceName: deviceInfo.deviceName,
      deviceType: deviceInfo.deviceType,
      ipAddress: deviceInfo.ipAddress,
      time: new Date().toUTCString(),
    };

    this.notificationService
      .sendLoginNotification(
        user.email ?? '',
        user.phone_number ?? null,
        notificationData,
        [NotificationChannel.EMAIL], // Explicitly enable only email for now
      )
      .catch((err: Error) => {
        this.logger.error(
          `[Login] Failed to send login notification for user ${user.id}: ${err.message}`,
        );
      });

    return { accessToken };
  }

  // ─── Register ────────────────────────────────────────────────────────────────

  async register(dto: RegisterDto): Promise<ApiResponseDto<any>> {
    const existingEmail = await this.authRepository.findByEmail(dto.email);
    if (existingEmail) {
      throw new AppException('Email already exists');
    }

    const existingNumber = await this.authRepository.findByNumber(
      dto.phone_number,
    );
    if (existingNumber) {
      throw new AppException('Mobile number already exists');
    }

    const hashedPassword = await hashPassword(dto.password);

    const user = await this.authRepository.createPasswordUser({
      name: dto.name,
      email: dto.email,
      phone_number: dto.phone_number,
      password: hashedPassword,
    });

    const otp = this.otpService.generateOtp();
    await this.otpService.storeOtp(user.id, otp, OtpPurpose.SIGNUP);

    this.logger.log(
      `[Register] Sending OTP to user ${user.id} (${user.email})`,
    );

    await this.notificationService.sendOtp(
      user.email!,
      user.phone_number!,
      otp,
      OtpTemplateType.REGISTRATION,
      [NotificationChannel.SMS, NotificationChannel.EMAIL],
    );

    return new ApiResponseDto(true, 'User registered successfully', {
      id: user.id,
      name: user.name,
      email: user.email,
      phone_number: user.phone_number,
      requiresOtpVerification: true,
    });
  }

  // ─── Verify OTP ──────────────────────────────────────────────────────────────

  async verifyOtp(
    dto: VerifyOtpDto,
    response: Response,
    deviceInfo: DeviceInfo,
  ): Promise<ApiResponseDto<any>> {
    const user = await this.authRepository.findById(dto.userId);
    if (!user) {
      throw new AppException('User not found');
    }

    const isExceeded = await this.otpService.hasExceededAttempts(
      dto.userId,
      dto.purpose,
    );
    if (isExceeded) {
      throw new AppException(
        'Maximum OTP verification attempts exceeded. Please request a new OTP.',
      );
    }

    const isValid = await this.otpService.verifyOtp(
      dto.userId,
      dto.otp,
      dto.purpose,
    );
    if (!isValid) {
      await this.otpService.incrementAttempts(dto.userId, dto.purpose);
      throw new AppException('Invalid OTP. Please try again.');
    }

    // Cleanup OTP + attempts regardless of purpose
    await this.otpService.deleteOtp(dto.userId, dto.purpose);
    await this.otpService.clearAttempts(dto.userId, dto.purpose);

    // ── SIGNUP flow ──────────────────────────────────────────────────────────
    if (dto.purpose === OtpPurpose.SIGNUP) {
      if (user.isVerified) {
        throw new AppException('User is already verified');
      }

      await this.authRepository.updateVerificationStatus(dto.userId, true);

      const { accessToken } = await this.issueTokenPair(
        user,
        response,
        deviceInfo,
      );

      return new ApiResponseDto(true, 'OTP verified successfully', {
        accessToken,
        user: this.buildUserPayload({ ...user, isVerified: true }),
      });
    }

    // ── RESET_PASSWORD flow ──────────────────────────────────────────────────
    const resetToken = randomUUID();
    await this.redisService.set(
      `password-reset:${resetToken}`,
      user.id,
      PASSWORD_RESET_TTL,
    );

    return new ApiResponseDto(true, 'OTP verified successfully', {
      verified: true,
      resetToken,
    });
  }

  // ─── Resend OTP ──────────────────────────────────────────────────────────────

  async resendOtp(dto: ResendOtpDto): Promise<ApiResponseDto<any>> {
    const user = await this.authRepository.findById(dto.userId);
    if (!user) {
      throw new AppException('User not found');
    }

    if (dto.purpose === OtpPurpose.SIGNUP && user.isVerified) {
      throw new AppException('User is already verified');
    }

    const canResend = await this.otpService.canResendOtp(dto.userId);
    if (!canResend) {
      throw new AppException(
        'Too many resend attempts. Please try again later.',
      );
    }

    const otp = this.otpService.generateOtp();
    await this.otpService.storeOtp(dto.userId, otp, dto.purpose);
    await this.otpService.trackResendRequest(dto.userId);
    await this.otpService.clearAttempts(dto.userId, dto.purpose);

    this.logger.log(
      `[ResendOtp] Sending new OTP to user ${dto.userId} (${user.email}) purpose=${dto.purpose}`,
    );

    await this.notificationService.sendOtp(
      user.email ?? '',
      user.phone_number ?? '',
      otp,
      OtpTemplateType.RESEND,
      [NotificationChannel.SMS, NotificationChannel.EMAIL],
    );

    return new ApiResponseDto(true, 'OTP resent successfully');
  }

  // ─── Login ───────────────────────────────────────────────────────────────────

  async login(
    dto: LoginDto,
    response: Response,
    deviceInfo: DeviceInfo,
  ): Promise<ApiResponseDto<any>> {
    const user = await this.authRepository.findByIdentifier(dto.identifier);

    if (!user) {
      throw new AppException(
        'No account exists, please signup',
        HttpStatus.NOT_FOUND,
      );
    }

    // Block Google accounts from password login
    if (user.provider === $Enums.AuthProvider.GOOGLE) {
      throw new AppException('This account uses Google Sign-In.');
    }

    const isPasswordValid = await comparePassword(
      dto.password,
      user.password ?? '',
    );
    if (!isPasswordValid) {
      throw new AppException('Invalid credentials');
    }

    // Unverified: auto-resend OTP and block login
    if (!user.isVerified) {
      const otp = this.otpService.generateOtp();
      await this.otpService.storeOtp(user.id, otp, OtpPurpose.SIGNUP);

      this.logger.log(
        `[Login] Unverified user ${user.id} — resending OTP automatically`,
      );

      await this.notificationService.sendOtp(
        user.email!,
        user.phone_number!,
        otp,
        OtpTemplateType.REGISTRATION,
        [NotificationChannel.SMS, NotificationChannel.EMAIL],
      );

      return new ApiResponseDto(
        true,
        'Account not verified. OTP has been resent.',
        {
          requiresOtpVerification: true,
          userId: user.id,
        },
      );
    }

    const { accessToken } = await this.issueTokenPair(user, response, deviceInfo);

    return new ApiResponseDto(true, 'Login successful', {
      accessToken,
      user: this.buildUserPayload(user),
    });
  }

  // ─── Forgot Password ─────────────────────────────────────────────────────────

  async forgotPassword(dto: ForgotPasswordDto): Promise<ApiResponseDto<any>> {
    // Normalise — strip leading +91 if present and keep bare 10-digit form
    const normalised = dto.phone.startsWith('+91')
      ? dto.phone.slice(3)
      : dto.phone;

    const user = await this.authRepository.findByNumber(normalised);

    if (!user) {
      throw new AppException('Account not found', HttpStatus.NOT_FOUND);
    }

    if (user.provider === $Enums.AuthProvider.GOOGLE) {
      throw new AppException(
        'This account uses Google Sign-In. Password recovery is not available.',
      );
    }

    const otp = this.otpService.generateOtp();
    await this.otpService.storeOtp(user.id, otp, OtpPurpose.RESET_PASSWORD);

    this.logger.log(
      `[ForgotPassword] Sending reset OTP to user ${user.id} (${user.phone_number})`,
    );

    await this.notificationService.sendOtp(
      user.email ?? '',
      user.phone_number!,
      otp,
      OtpTemplateType.FORGOT_PASSWORD,
      [NotificationChannel.SMS, NotificationChannel.EMAIL],
    );

    return new ApiResponseDto(true, 'OTP sent successfully', {
      otpSent: true,
      userId: user.id,
    });
  }

  // ─── Reset Password ──────────────────────────────────────────────────────────

  async resetPassword(dto: ResetPasswordDto): Promise<ApiResponseDto<any>> {
    const redisKey = `password-reset:${dto.resetToken}`;
    const userId = await this.redisService.get(redisKey);

    if (!userId) {
      throw new AppException(
        'Invalid or expired reset token',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const user = await this.authRepository.findById(userId);
    if (!user) {
      throw new AppException('User not found');
    }

    const hashedPassword = await hashPassword(dto.newPassword);
    await this.authRepository.updatePassword(userId, hashedPassword);

    // One-time use: delete token immediately after password update
    await this.redisService.del(redisKey);

    this.logger.log(`[ResetPassword] Password updated for user ${userId}`);

    // Send password reset notification (non-blocking)
    this.notificationService
      .sendOtp(
        user.email ?? '',
        user.phone_number ?? '',
        '',
        OtpTemplateType.PASSWORD_RESET,
        [NotificationChannel.EMAIL],
      )
      .catch((err) => {
        this.logger.error(
          `Failed to send password reset notification: ${err.message}`,
        );
      });

    return new ApiResponseDto(true, 'Password reset successfully', {
      success: true,
    });
  }

  // ─── Google Login ────────────────────────────────────────────────────────────

  async googleLogin(
    dto: GoogleLoginDto,
    response: Response,
    deviceInfo: DeviceInfo,
  ): Promise<ApiResponseDto<any>> {
    const payload = await this.googleService.verifyIdToken(dto.idToken);

    const user = await this.authRepository.upsertGoogleUser({
      googleId: payload.sub,
      email: payload.email,
      name: payload.name,
    });

    this.logger.log(
      `[GoogleLogin] User ${user.id} authenticated via Google (${user.email})`,
    );

    const { accessToken } = await this.issueTokenPair(user, response, deviceInfo);

    return new ApiResponseDto(true, 'Google login successful', {
      accessToken,
      user: this.buildUserPayload(user),
    });
  }

  // ─── Refresh Tokens ──────────────────────────────────────────────────────────

  /**
   * Refresh Token Rotation flow:
   * 1. Verify JWT signature (done by RefreshTokenStrategy before reaching here)
   * 2. Find matching active token record via bcrypt comparison
   * 3. Reject if not found, revoked, or expired
   * 4. Revoke old record, create new one (rotation)
   * 5. Return new access token + set new refresh cookie
   */
  async refreshTokens(
    userId: string,
    rawRefreshToken: string,
    response: Response,
    deviceInfo: DeviceInfo,
  ): Promise<ApiResponseDto<any>> {
    const tokenRecord = await this.tokenService.findValidTokenRecord(
      userId,
      rawRefreshToken,
    );

    if (!tokenRecord) {
      throw new AppException(
        'Refresh token not found or already revoked',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const user = await this.authRepository.findById(userId);
    if (!user) {
      throw new AppException('User not found', HttpStatus.UNAUTHORIZED);
    }

    // Generate new token pair
    const newAccessToken = this.tokenService.generateAccessToken(
      user.id,
      user.email,
    );
    const newRefreshToken = this.tokenService.generateRefreshToken(user.id);

    // Rotate: revoke old, store new (preserves device info from current request)
    await this.tokenService.rotateRefreshToken(
      userId,
      tokenRecord.id,
      newRefreshToken,
      deviceInfo,
    );

    response.cookie(
      'refresh_token',
      newRefreshToken,
      this.tokenService.getCookieOptions(),
    );

    this.logger.log(`[Refresh] Token rotated for user ${userId}`);

    return new ApiResponseDto(true, 'Token refreshed successfully', {
      accessToken: newAccessToken,
    });
  }

  // ─── Logout ──────────────────────────────────────────────────────────────────

  /**
   * Single-device logout:
   * - Finds and revokes the matching refresh token record
   * - Clears the cookie on the client
   */
  async logout(
    userId: string,
    rawRefreshToken: string,
    response: Response,
  ): Promise<ApiResponseDto<any>> {
    const tokenRecord = await this.tokenService.findValidTokenRecord(
      userId,
      rawRefreshToken,
    );

    if (tokenRecord) {
      await this.tokenService.revokeToken(tokenRecord.id);
      this.logger.log(`[Logout] Revoked token ${tokenRecord.id} for user ${userId}`);
    }

    response.clearCookie('refresh_token', this.tokenService.getCookieOptions());

    return new ApiResponseDto(true, 'Logged out successfully', {
      success: true,
    });
  }

  // ─── Logout All ──────────────────────────────────────────────────────────────

  /**
   * Logout from all devices:
   * - Revokes every active refresh token for the user
   * - Clears the current cookie
   */
  async logoutAll(
    userId: string,
    response: Response,
  ): Promise<ApiResponseDto<any>> {
    await this.tokenService.revokeAllForUser(userId);

    response.clearCookie('refresh_token', this.tokenService.getCookieOptions());

    this.logger.log(`[LogoutAll] All sessions revoked for user ${userId}`);

    return new ApiResponseDto(true, 'Logged out from all devices', {
      success: true,
    });
  }

  // ─── Sessions ────────────────────────────────────────────────────────────────

  /**
   * Returns all active sessions for the user with device info.
   * tokenHash is never included — only metadata.
   */
  async getSessions(userId: string): Promise<ApiResponseDto<any>> {
    const sessions = await this.authRepository.findUserRefreshTokens(userId);

    return new ApiResponseDto(true, 'Active sessions retrieved', { sessions });
  }

  // ─── Link Phone (Google users only) ─────────────────────────────────────────

  async linkPhone(
    userId: string,
    dto: LinkPhoneDto,
  ): Promise<ApiResponseDto<any>> {
    const user = await this.authRepository.findById(userId);
    if (!user) {
      throw new AppException('User not found');
    }

    if (user.provider !== $Enums.AuthProvider.GOOGLE) {
      throw new AppException(
        'Phone linking is only available for Google accounts.',
      );
    }

    if (user.phone_number) {
      throw new AppException('A phone number is already linked to this account.');
    }

    const existing = await this.authRepository.findByNumber(dto.phone_number);
    if (existing) {
      throw new AppException('This phone number is already in use.');
    }

    const updated = await this.authRepository.updatePhoneNumber(
      userId,
      dto.phone_number,
    );

    this.logger.log(
      `[LinkPhone] Phone number linked to Google user ${userId}`,
    );

    return new ApiResponseDto(true, 'Phone number linked successfully', {
      user: this.buildUserPayload(updated),
    });
  }

  // ─── Change Password ─────────────────────────────────────────────────────────

  async changePassword(
    userId: string,
    dto: ChangePasswordDto,
  ): Promise<ApiResponseDto<any>> {
    const user = await this.authRepository.findById(userId);
    if (!user) {
      throw new AppException('User not found', HttpStatus.NOT_FOUND);
    }

    if (user.provider !== $Enums.AuthProvider.PASSWORD) {
      throw new AppException(
        'This account uses Google Sign-In. Password operations are not available.',
        HttpStatus.BAD_REQUEST,
      );
    }

    const isPasswordValid = await comparePassword(
      dto.oldPassword,
      user.password ?? '',
    );
    if (!isPasswordValid) {
      throw new AppException('Invalid old password', HttpStatus.BAD_REQUEST);
    }

    if (dto.oldPassword === dto.newPassword) {
      throw new AppException(
        'New password must be different from current password',
        HttpStatus.BAD_REQUEST,
      );
    }

    const hashedPassword = await hashPassword(dto.newPassword);
    await this.authRepository.updatePassword(userId, hashedPassword);

    this.logger.log(`[ChangePassword] Password updated for user ${userId}`);

    // Send password change notification (non-blocking)
    this.notificationService
      .sendOtp(
        user.email ?? '',
        user.phone_number ?? '',
        '',
        OtpTemplateType.PASSWORD_CHANGED,
        [NotificationChannel.EMAIL],
      )
      .catch((err) => {
        this.logger.error(
          `Failed to send password change notification: ${err.message}`,
        );
      });

    return new ApiResponseDto(true, 'Password changed successfully', {
      success: true,
    });
  }
}
