import { ApiProperty } from '@nestjs/swagger';
import { AssetProvider } from '../enums/asset-provider.enum';
import { AssetStatus } from '../enums/asset-status.enum';

/**
 * Outbound shape of a persisted Asset record.
 * Returned from registration, activation, and owner-asset queries.
 */
export class AssetResponseDto {
  @ApiProperty({ example: 'clxyz123' })
  id!: string;

  @ApiProperty({ enum: AssetProvider, example: AssetProvider.CLOUDINARY })
  provider!: AssetProvider;

  @ApiProperty({ example: 'products/abc123/1718614800000' })
  publicId!: string;

  @ApiProperty({
    example: 'https://res.cloudinary.com/demo/image/upload/products/abc123/1718614800000.jpg',
  })
  url!: string;

  @ApiProperty({
    example: 'https://res.cloudinary.com/demo/image/upload/q_auto,f_auto/products/abc123/1718614800000',
  })
  optimizedUrl!: string;

  @ApiProperty({
    example: 'https://res.cloudinary.com/demo/image/upload/w_400,h_400,c_fill,q_auto,f_auto/products/abc123/1718614800000',
  })
  thumbnailUrl!: string;

  @ApiProperty({
    example: 'https://res.cloudinary.com/demo/image/upload/w_20,q_1,e_blur:1000,f_auto/products/abc123/1718614800000',
  })
  placeholderUrl!: string;

  @ApiProperty({ example: 1920 })
  width!: number;

  @ApiProperty({ example: 1080 })
  height!: number;

  @ApiProperty({ example: 'jpg' })
  format!: string;

  @ApiProperty({ example: 'image/jpeg' })
  mimeType!: string;

  @ApiProperty({ description: 'File size in bytes.', example: 204800 })
  size!: number;

  @ApiProperty({ enum: AssetStatus, example: AssetStatus.ACTIVE })
  status!: AssetStatus;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

export class AssetResponseListDto {
  @ApiProperty({ type: [AssetResponseDto] })
  items!: AssetResponseDto[];
}
