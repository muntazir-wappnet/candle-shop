import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class GoogleLoginDto {
  @ApiProperty({
    example: 'eyJhbGciOiJSUzI1NiIs...',
    description: 'Google ID token obtained from the client-side Google Sign-In SDK',
  })
  @IsString()
  @IsNotEmpty()
  idToken!: string;
}
