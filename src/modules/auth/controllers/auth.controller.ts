import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from '../services/auth.service';
import { RegisterDto } from '../dto/register.dto';
import { ApiSuccessResponse } from '../../../common/decorators/api-success-response.decorator';
import { VerifyOtpDto } from '../dto/verify-otp.dto';
import { ResendOtpDto } from '../dto/resend-otp.dto';

@Controller('auth')
export class AuthController {
    constructor(
        private readonly authService: AuthService,
    ) { }

    @Post('register')
    @ApiSuccessResponse('User registered successfully')
    register(
        @Body() registerDto: RegisterDto,
    ) {
        return this.authService.register(
            registerDto,
        );
    }

    @Post('verify-otp')
    @ApiSuccessResponse('OTP verified successfully')
    verifyOtp(
        @Body() verifyOtpDto: VerifyOtpDto,
    ) {
        return this.authService.verifyOtp(
            verifyOtpDto,
        );
    }

    @Post('resend-otp')
    @ApiSuccessResponse('OTP resent successfully')
    resendOtp(
        @Body() resendOtpDto: ResendOtpDto,
    ) {
        return this.authService.resendOtp(
            resendOtpDto,
        );
    }
}
