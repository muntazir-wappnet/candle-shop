import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { AssetOwnerType } from '../enums/asset-owner-type.enum';
import { AssetRole } from '../enums/asset-role.enum';

/**
 * Input DTO for creating an AssetReference row that links an
 * existing Asset to a domain entity.
 */
export class CreateReferenceDto {
  @ApiProperty({
    description: 'ID of the Asset to reference.',
    example:     'clxyz123',
  })
  @IsString()
  assetId!: string;

  @ApiProperty({
    description: 'The type of entity that owns this reference.',
    enum:        AssetOwnerType,
    example:     AssetOwnerType.PRODUCT,
  })
  @IsEnum(AssetOwnerType)
  ownerType!: AssetOwnerType;

  @ApiProperty({
    description: 'Primary key of the owning entity.',
    example:     'clproduct456',
  })
  @IsString()
  ownerId!: string;

  @ApiProperty({
    description: 'Role this asset plays for the owner.',
    enum:        AssetRole,
    example:     AssetRole.COVER,
  })
  @IsEnum(AssetRole)
  role!: AssetRole;

  @ApiPropertyOptional({
    description: 'Display sort order within the role group. Lower = first.',
    example:     0,
    default:     0,
  })
  @IsInt()
  @Min(0)
  @IsOptional()
  sortOrder?: number = 0;

  @ApiPropertyOptional({
    description: 'Whether this is the primary asset for the owner + role combination.',
    example:     false,
    default:     false,
  })
  @IsBoolean()
  @IsOptional()
  isPrimary?: boolean = false;
}
