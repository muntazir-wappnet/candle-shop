import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class ForgotPasswordDto {
  @ApiProperty({
    example: '9876543210',
    description: 'Registered phone number (E.164 or 10-digit Indian format)',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^(\+91)?[6-9]\d{9}$/, {
    message: 'Please enter a valid phone number',
  })
  phone!: string;
}
