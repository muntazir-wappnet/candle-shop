import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({
    example: 'OldPassword123',
    description: 'The current password of the user',
  })
  @IsString()
  @IsNotEmpty()
  oldPassword!: string;

  @ApiProperty({
    example: 'NewPassword123',
    minLength: 8,
    description: 'The new password of the user, must contain uppercase, lowercase and number',
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
