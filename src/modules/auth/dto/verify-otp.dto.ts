import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString, Length } from 'class-validator';
import { OtpPurpose } from '../enums/otp-purpose.enum';

export class VerifyOtpDto {
  @ApiProperty({
    example: 'user-id-here',
    description: 'User ID',
  })
  @IsString()
  @IsNotEmpty()
  userId!: string;

  @ApiProperty({
    example: '123456',
    description: '6-digit OTP code',
  })
  @IsString()
  @IsNotEmpty()
  @Length(6, 6, { message: 'OTP must be exactly 6 characters' })
  otp!: string;

  @ApiProperty({
    enum: OtpPurpose,
    example: OtpPurpose.SIGNUP,
    description: 'Purpose of OTP verification — SIGNUP or RESET_PASSWORD',
  })
  @IsEnum(OtpPurpose)
  @IsNotEmpty()
  purpose!: OtpPurpose;
}