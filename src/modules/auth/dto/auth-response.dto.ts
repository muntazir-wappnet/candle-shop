import { ApiProperty } from '@nestjs/swagger';
import { UserRole, AuthProvider, DeviceType } from '@prisma/client';

// ─── Shared ───────────────────────────────────────────────────────────────────

export class UserResponseDto {
  @ApiProperty({ example: 'clv1234560000ux8v7z9q1abc' })
  id!: string;

  @ApiProperty({ example: 'John Doe', nullable: true })
  name!: string | null;

  @ApiProperty({ example: 'john@example.com', nullable: true })
  email!: string | null;

  @ApiProperty({ example: '9876543210', nullable: true })
  phone_number!: string | null;

  @ApiProperty({ enum: UserRole, example: UserRole.CUSTOMER })
  role!: UserRole;

  @ApiProperty({ example: true })
  isVerified!: boolean;

  @ApiProperty({ enum: AuthProvider, example: AuthProvider.PASSWORD })
  provider!: AuthProvider;
}

// ─── Register ────────────────────────────────────────────────────────────────

export class RegisterResponseDto {
  @ApiProperty({ example: 'clv1234560000ux8v7z9q1abc' })
  id!: string;

  @ApiProperty({ example: 'John Doe' })
  name!: string | null;

  @ApiProperty({ example: 'john@example.com' })
  email!: string | null;

  @ApiProperty({ example: '9876543210' })
  phone_number!: string | null;

  @ApiProperty({ example: true })
  requiresOtpVerification!: boolean;
}

// ─── Verify OTP ───────────────────────────────────────────────────────────────

export class VerifyOtpResponseDto {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...', required: false })
  accessToken?: string;

  @ApiProperty({ type: () => UserResponseDto, required: false })
  user?: UserResponseDto;

  @ApiProperty({ example: true, required: false })
  verified?: boolean;

  @ApiProperty({ example: '3a5b6c7d-e8f9-0a1b-2c3d-4e5f6a7b8c9d', required: false })
  resetToken?: string;
}

// ─── Login ────────────────────────────────────────────────────────────────────

export class LoginResponseDto {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...', required: false })
  accessToken?: string;

  @ApiProperty({ type: () => UserResponseDto, required: false })
  user?: UserResponseDto;

  @ApiProperty({ example: true, required: false })
  requiresOtpVerification?: boolean;

  @ApiProperty({ example: 'clv1234560000ux8v7z9q1abc', required: false })
  userId?: string;
}

// ─── Forgot Password ──────────────────────────────────────────────────────────

export class ForgotPasswordResponseDto {
  @ApiProperty({ example: true })
  otpSent!: boolean;

  @ApiProperty({ example: 'clv1234560000ux8v7z9q1abc' })
  userId!: string;
}

// ─── Reset / Change Password ──────────────────────────────────────────────────

export class ResetPasswordResponseDto {
  @ApiProperty({ example: true })
  success!: boolean;
}

export class ChangePasswordResponseDto {
  @ApiProperty({ example: true })
  success!: boolean;
}

// ─── Google Login ─────────────────────────────────────────────────────────────

export class GoogleLoginResponseDto {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  accessToken!: string;

  @ApiProperty({ type: () => UserResponseDto })
  user!: UserResponseDto;
}

// ─── Link Phone ───────────────────────────────────────────────────────────────

export class LinkPhoneResponseDto {
  @ApiProperty({ type: () => UserResponseDto })
  user!: UserResponseDto;
}

// ─── Refresh Token ───────────────────────────────────────────────────────────

export class RefreshTokenResponseDto {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  accessToken!: string;
}

// ─── Logout ───────────────────────────────────────────────────────────────────

export class LogoutResponseDto {
  @ApiProperty({ example: true })
  success!: boolean;
}

// ─── Sessions ────────────────────────────────────────────────────────────────

export class SessionDto {
  @ApiProperty({ example: 'clv1234560000ux8v7z9q1abc' })
  id!: string;

  @ApiProperty({ example: 'Chrome on Windows', nullable: true })
  deviceName!: string | null;

  @ApiProperty({ enum: DeviceType, example: DeviceType.DESKTOP })
  deviceType!: DeviceType;

  @ApiProperty({ example: '192.168.1.1', nullable: true })
  ipAddress!: string | null;

  @ApiProperty({ example: '2026-06-16T10:00:00.000Z', nullable: true })
  lastUsedAt!: Date | null;

  @ApiProperty({ example: '2026-06-15T08:30:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-07-15T08:30:00.000Z' })
  expiresAt!: Date;
}

export class SessionsResponseDto {
  @ApiProperty({ type: () => [SessionDto] })
  sessions!: SessionDto[];
}
