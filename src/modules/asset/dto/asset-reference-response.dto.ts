import { ApiProperty } from '@nestjs/swagger';
import { AssetOwnerType } from '../enums/asset-owner-type.enum';
import { AssetRole } from '../enums/asset-role.enum';
import { AssetResponseDto } from './asset-response.dto';

/**
 * Outbound shape of an AssetReference record,
 * with the nested Asset included for full context.
 */
export class AssetReferenceResponseDto {
  @ApiProperty({ example: 'clref789' })
  id!: string;

  @ApiProperty({ example: 'clxyz123' })
  assetId!: string;

  @ApiProperty({ type: () => AssetResponseDto })
  asset!: AssetResponseDto;

  @ApiProperty({ enum: AssetOwnerType, example: AssetOwnerType.PRODUCT })
  ownerType!: AssetOwnerType;

  @ApiProperty({ example: 'clproduct456' })
  ownerId!: string;

  @ApiProperty({ enum: AssetRole, example: AssetRole.COVER })
  role!: AssetRole;

  @ApiProperty({ example: 0 })
  sortOrder!: number;

  @ApiProperty({ example: true })
  isPrimary!: boolean;

  @ApiProperty()
  createdAt!: Date;
}

/**
 * Wraps a list of AssetReference records for bulk endpoints.
 */
export class AssetReferenceListResponseDto {
  @ApiProperty({ type: [AssetReferenceResponseDto] })
  items!: AssetReferenceResponseDto[];
}
