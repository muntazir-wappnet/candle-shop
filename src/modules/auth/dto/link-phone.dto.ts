import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class LinkPhoneDto {
  @ApiProperty({
    example: '9876543210',
    description: '10-digit Indian mobile number',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[6-9]\d{9}$/, {
    message: 'Please enter a valid 10-digit mobile number',
  })
  phone_number!: string;
}
