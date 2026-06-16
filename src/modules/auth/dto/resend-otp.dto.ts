import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { OtpPurpose } from '../enums/otp-purpose.enum';

export class ResendOtpDto {
  @ApiProperty({
    example: 'user-id-here',
    description: 'User ID',
  })
  @IsString()
  @IsNotEmpty()
  userId!: string;

  @ApiProperty({
    enum: OtpPurpose,
    example: OtpPurpose.SIGNUP,
    description: 'Purpose of the OTP to resend — SIGNUP or RESET_PASSWORD',
  })
  @IsEnum(OtpPurpose)
  @IsNotEmpty()
  purpose!: OtpPurpose;
}
