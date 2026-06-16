import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    example: 'john@example.com',
    description: 'Email address or phone number',
  })
  @IsString()
  @IsNotEmpty()
  identifier!: string;

  @ApiProperty({
    example: 'Password123',
    description: 'Account password',
  })
  @IsString()
  @IsNotEmpty()
  password!: string;
}
