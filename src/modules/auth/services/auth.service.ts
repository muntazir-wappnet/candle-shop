import { Injectable } from '@nestjs/common';
import { AuthRepository } from '../repositories/auth.repository';
import { RegisterDto } from '../dto/register.dto';
import * as bcrypt from 'bcrypt';
import { AppException } from '../../../common/exceptions/app.exception';
import { ApiResponseDto } from '../../../common/dto/api-response.dto';
import { OtpService } from './otp.service';
import { VerifyOtpDto } from '../dto/verify-otp.dto';
import { ResendOtpDto } from '../dto/resend-otp.dto';

@Injectable()
export class AuthService {
    constructor(
        private readonly authRepository: AuthRepository,
        private readonly otpService: OtpService,
    ) { }

    async register(dto: RegisterDto): Promise<ApiResponseDto<any>> {
        const existingEmail =
            await this.authRepository.findByEmail(
                dto.email,
            );

        if (existingEmail) {
            throw new AppException(
                'Email already exists',
            );
        }

        const existingNumber =
            await this.authRepository.findByNumber(
                dto.phone_number,
            );

        if (existingNumber) {
            throw new AppException(
                'Mobile number already exists',
            );
        }

        const hashedPassword =
            await bcrypt.hash(dto.password, 10);

        const user =
            await this.authRepository.create({
                name: dto.name,
                email: dto.email,
                phone_number: dto.phone_number,
                password: hashedPassword,
            });

        const otp = this.otpService.generateOtp();
        await this.otpService.storeOtp(user.id, otp);
        console.log(`[OTP Verification] User registration: generated OTP for ${user.name} (${user.email}) -> ${otp}`);

        return new ApiResponseDto(
            true,
            'User registered successfully',
            {
                id: user.id,
                name: user.name,
                email: user.email,
                phone_number: user.phone_number,
                requiresOtpVerification: true,
            },
        );
    }

    async verifyOtp(dto: VerifyOtpDto): Promise<ApiResponseDto<any>> {
        const user = await this.authRepository.findById(dto.userId);
        if (!user) {
            throw new AppException('User not found');
        }

        if (user.isVerified) {
            throw new AppException('User is already verified');
        }

        const isExceeded = await this.otpService.hasExceededAttempts(dto.userId);
        if (isExceeded) {
            throw new AppException(
                'Maximum OTP verification attempts exceeded. Please request a new OTP.',
            );
        }

        const isValid = await this.otpService.verifyOtp(dto.userId, dto.otp);
        if (!isValid) {
            await this.otpService.incrementAttempts(dto.userId);
            throw new AppException('Invalid OTP. Please try again.');
        }

        await this.authRepository.updateVerificationStatus(dto.userId, true);
        await this.otpService.deleteOtp(dto.userId);
        await this.otpService.clearAttempts(dto.userId);

        return new ApiResponseDto(
            true,
            'OTP verified successfully',
            {
                id: user.id,
                email: user.email,
                isVerified: true,
            },
        );
    }

    async resendOtp(dto: ResendOtpDto): Promise<ApiResponseDto<any>> {
        const user = await this.authRepository.findById(dto.userId);
        if (!user) {
            throw new AppException('User not found');
        }

        if (user.isVerified) {
            throw new AppException('User is already verified');
        }

        const canResend = await this.otpService.canResendOtp(dto.userId);
        if (!canResend) {
            throw new AppException('Too many resend attempts. Please try again later.');
        }

        const otp = this.otpService.generateOtp();
        await this.otpService.storeOtp(dto.userId, otp);
        await this.otpService.trackResendRequest(dto.userId);
        await this.otpService.clearAttempts(dto.userId);

        console.log(`[OTP Verification] Resend request: generated new OTP for ${user.name} (${user.email}) -> ${otp}`);

        return new ApiResponseDto(
            true,
            'OTP resent successfully',
        );
    }
}
