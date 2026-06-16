import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({
    example: 'uuid-reset-token-here',
    description: 'One-time reset token received after OTP verification',
  })
  @IsString()
  @IsNotEmpty()
  resetToken!: string;

  @ApiProperty({
    example: 'NewPassword123',
    minLength: 8,
    description: 'Must contain uppercase, lowercase and number',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).*$/, {
    message:
      'Password must contain at least one uppercase letter, one lowercase letter, and one number',
  })
  newPassword!: string;
}
