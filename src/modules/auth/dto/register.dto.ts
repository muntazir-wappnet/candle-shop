import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';
import { Match } from '../../../common/decorators/match.decorator';

export class RegisterDto {
  @ApiProperty({
    example: 'John Doe',
    minLength: 3,
    description: 'User full name',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  name!: string;

  @ApiProperty({
    example: 'john@example.com',
    description: 'User email address',
  })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({
    example: '9876543210',
    description: '10 digit Indian mobile number',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[6-9]\d{9}$/, {
    message: 'Please enter a valid mobile number',
  })
  phone_number!: string;

  @ApiProperty({
    example: 'Password123',
    minLength: 8,
    description:
      'Must contain uppercase, lowercase and number',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).*$/, {
    message:
      'Password must contain at least one uppercase letter, one lowercase letter, and one number',
  })
  password!: string;

  @ApiProperty({
    example: 'Password123',
    description: 'Must match password',
  })
  @IsString()
  @IsNotEmpty()
  @Match('password', {
    message: 'Passwords do not match',
  })
  confirmPassword!: string;
}