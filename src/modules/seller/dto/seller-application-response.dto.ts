import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SellerApplicationStatus } from '../enums/seller-application-status.enum';

export class AssetSummaryDto {
  @ApiProperty() id!: string;
  @ApiProperty() url!: string;
  @ApiProperty() optimizedUrl!: string;
  @ApiProperty() thumbnailUrl!: string;
}

export class ReviewerSummaryDto {
  @ApiProperty() id!: string;
  @ApiPropertyOptional({ nullable: true }) name!: string | null;
  @ApiPropertyOptional({ nullable: true }) email!: string | null;
}

export class SellerApplicationResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() userId!: string;
  @ApiProperty() storeName!: string;
  @ApiProperty() description!: string;
  @ApiPropertyOptional({ nullable: true }) gstNumber!: string | null;
  @ApiPropertyOptional({ nullable: true }) instagramUrl!: string | null;
  @ApiPropertyOptional({ nullable: true }) websiteUrl!: string | null;
  @ApiProperty({ enum: SellerApplicationStatus }) status!: SellerApplicationStatus;
  @ApiPropertyOptional({ type: ReviewerSummaryDto, nullable: true }) reviewer!: ReviewerSummaryDto | null;
  @ApiPropertyOptional({ nullable: true }) reviewedAt!: Date | null;
  @ApiPropertyOptional({ nullable: true }) rejectionReason!: string | null;
  @ApiPropertyOptional({ type: AssetSummaryDto, nullable: true }) verificationDocument!: AssetSummaryDto | null;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
}
