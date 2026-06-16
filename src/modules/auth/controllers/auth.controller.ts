import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { ApiBearerAuth, ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { AuthService } from '../services/auth.service';
import { RegisterDto } from '../dto/register.dto';
import { LoginDto } from '../dto/login.dto';
import { VerifyOtpDto } from '../dto/verify-otp.dto';
import { ResendOtpDto } from '../dto/resend-otp.dto';
import { ForgotPasswordDto } from '../dto/forgot-password.dto';
import { ResetPasswordDto } from '../dto/reset-password.dto';
import { GoogleLoginDto } from '../dto/google-login.dto';
import { LinkPhoneDto } from '../dto/link-phone.dto';
import { ChangePasswordDto } from '../dto/change-password.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RefreshTokenGuard } from '../guards/refresh-token.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../strategies/jwt.strategy';
import type { RefreshTokenPayloadWithRaw } from '../strategies/refresh-token.strategy';
import { ApiSuccessResponse } from '../../../common/decorators/api-success-response.decorator';
import { extractDeviceInfo } from '../helpers/device-info.helper';
import {
  RegisterResponseDto,
  LoginResponseDto,
  VerifyOtpResponseDto,
  ForgotPasswordResponseDto,
  ResetPasswordResponseDto,
  GoogleLoginResponseDto,
  LinkPhoneResponseDto,
  ChangePasswordResponseDto,
  RefreshTokenResponseDto,
  LogoutResponseDto,
  SessionsResponseDto,
} from '../dto/auth-response.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ─── Public endpoints ─────────────────────────────────────────────────────

  @Post('register')
  @ApiSuccessResponse('User registered successfully', RegisterResponseDto)
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @ApiSuccessResponse('Login successful', LoginResponseDto)
  login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) response: Response,
    @Req() req: Request,
  ) {
    return this.authService.login(dto, response, extractDeviceInfo(req));
  }

  @Post('verify-otp')
  @ApiSuccessResponse('OTP verified successfully', VerifyOtpResponseDto)
  verifyOtp(
    @Body() dto: VerifyOtpDto,
    @Res({ passthrough: true }) response: Response,
    @Req() req: Request,
  ) {
    return this.authService.verifyOtp(dto, response, extractDeviceInfo(req));
  }

  @Post('resend-otp')
  @ApiSuccessResponse('OTP resent successfully')
  resendOtp(@Body() dto: ResendOtpDto) {
    return this.authService.resendOtp(dto);
  }

  @Post('forgot-password')
  @ApiSuccessResponse('OTP sent for password reset', ForgotPasswordResponseDto)
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Post('reset-password')
  @ApiSuccessResponse('Password reset successfully', ResetPasswordResponseDto)
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Post('google')
  @ApiSuccessResponse('Google login successful', GoogleLoginResponseDto)
  googleLogin(
    @Body() dto: GoogleLoginDto,
    @Res({ passthrough: true }) response: Response,
    @Req() req: Request,
  ) {
    return this.authService.googleLogin(dto, response, extractDeviceInfo(req));
  }

  // ─── Refresh / Session endpoints (cookie-based) ───────────────────────────

  /**
   * POST /auth/refresh
   *
   * Reads the HttpOnly refresh_token cookie, verifies it, rotates the token,
   * and returns a new access token. Requires no Authorization header.
   */
  @Post('refresh')
  @UseGuards(RefreshTokenGuard)
  @ApiCookieAuth('refresh_token')
  @ApiSuccessResponse('Token refreshed successfully', RefreshTokenResponseDto)
  refreshTokens(
    @CurrentUser() user: RefreshTokenPayloadWithRaw,
    @Res({ passthrough: true }) response: Response,
    @Req() req: Request,
  ) {
    return this.authService.refreshTokens(
      user.sub,
      user.refreshToken,
      response,
      extractDeviceInfo(req),
    );
  }

  /**
   * POST /auth/logout
   *
   * Revokes the current device's refresh token and clears the cookie.
   * Requires the refresh_token cookie (no access token needed).
   */
  @Post('logout')
  @UseGuards(RefreshTokenGuard)
  @ApiCookieAuth('refresh_token')
  @ApiSuccessResponse('Logged out successfully', LogoutResponseDto)
  logout(
    @CurrentUser() user: RefreshTokenPayloadWithRaw,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.authService.logout(user.sub, user.refreshToken, response);
  }

  // ─── Protected endpoints (access token required) ──────────────────────────

  /**
   * POST /auth/logout-all
   *
   * Revokes ALL refresh tokens for the authenticated user.
   * Requires a valid access token (Bearer).
   */
  @Post('logout-all')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiSuccessResponse('Logged out from all devices', LogoutResponseDto)
  logoutAll(
    @CurrentUser() user: JwtPayload,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.authService.logoutAll(user.sub, response);
  }

  /**
   * GET /auth/sessions
   *
   * Returns all active sessions with device info for the authenticated user.
   * Never exposes tokenHash — only metadata (deviceName, ip, lastUsed, etc.).
   */
  @Get('sessions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiSuccessResponse('Active sessions retrieved', SessionsResponseDto)
  getSessions(@CurrentUser() user: JwtPayload) {
    return this.authService.getSessions(user.sub);
  }

  @Post('link-phone')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiSuccessResponse('Phone number linked successfully', LinkPhoneResponseDto)
  linkPhone(
    @CurrentUser() user: JwtPayload,
    @Body() dto: LinkPhoneDto,
  ) {
    return this.authService.linkPhone(user.sub, dto);
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiSuccessResponse('Password changed successfully', ChangePasswordResponseDto)
  changePassword(
    @CurrentUser() user: JwtPayload,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(user.sub, dto);
  }
}
