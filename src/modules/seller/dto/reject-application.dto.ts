import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength, MaxLength } from 'class-validator';

export class RejectApplicationDto {
  @ApiProperty({
    example: 'Verification document is not legible. Please resubmit a clear scan.',
    description: 'Reason for rejection (10–500 chars)',
  })
  @IsString()
  @MinLength(10)
  @MaxLength(500)
  rejectionReason!: string;
}
