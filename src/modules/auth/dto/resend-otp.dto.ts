import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class ResendOtpDto {
  @ApiProperty({
    example: 'user-id-here',
    description: 'User ID',
  })
  @IsString()
  @IsNotEmpty()
  userId!: string;
}
