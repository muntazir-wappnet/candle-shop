import { ApiProperty } from '@nestjs/swagger';
import { ArrayMinSize, IsArray, IsEnum, IsString } from 'class-validator';
import { AssetRole } from '../enums/asset-role.enum';

export class ReplaceOwnerAssetsDto {
  @ApiProperty({
    description: 'Role group to replace (all existing assets in this role will be marked PENDING_DELETION).',
    enum:        AssetRole,
    example:     AssetRole.GALLERY,
  })
  @IsEnum(AssetRole)
  role!: AssetRole;

  @ApiProperty({
    description: 'Ordered list of new Asset IDs (already registered as TEMPORARY) to activate and reference.',
    type:        [String],
    example:     ['clxyz001', 'clxyz002', 'clxyz003'],
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  assetIds!: string[];
}
