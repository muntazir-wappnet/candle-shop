import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SellerStatus } from '../enums/seller-status.enum';

export class SellerResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() userId!: string;
  @ApiProperty() storeName!: string;
  @ApiProperty() description!: string;
  @ApiProperty() slug!: string;
  @ApiProperty({ enum: SellerStatus }) status!: SellerStatus;
  @ApiPropertyOptional({ nullable: true }) approvedAt!: Date | null;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
}
