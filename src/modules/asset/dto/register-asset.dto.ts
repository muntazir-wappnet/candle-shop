import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { AssetProvider } from '../enums/asset-provider.enum';

/**
 * Input DTO for registering a newly uploaded asset.
 * Callers provide the IMediaResponse fields + the mimeType from the original
 * MulterFile (mimeType is not returned by Cloudinary's API).
 */
export class RegisterAssetDto {
  @ApiProperty({
    description: 'Storage provider that hosts the file.',
    enum:        AssetProvider,
    default:     AssetProvider.CLOUDINARY,
  })
  @IsEnum(AssetProvider)
  @IsOptional()
  provider?: AssetProvider = AssetProvider.CLOUDINARY;

  @ApiProperty({
    description: 'Provider-internal public ID (used for deletion and URL generation).',
    example:     'products/abc123/1718614800000',
  })
  @IsString()
  publicId!: string;

  @ApiProperty({
    description: 'Original CDN URL returned by the storage provider.',
    example:     'https://res.cloudinary.com/demo/image/upload/products/abc123/1718614800000.jpg',
  })
  @IsString()
  url!: string;

  @ApiProperty({
    description: 'Auto-quality + auto-format CDN URL.',
    example:     'https://res.cloudinary.com/demo/image/upload/q_auto,f_auto/products/abc123/1718614800000',
  })
  @IsString()
  optimizedUrl!: string;

  @ApiProperty({
    description: '400×400 fill-cropped thumbnail URL.',
    example:     'https://res.cloudinary.com/demo/image/upload/w_400,h_400,c_fill,q_auto,f_auto/products/abc123/1718614800000',
  })
  @IsString()
  thumbnailUrl!: string;

  @ApiProperty({
    description: '20px blurred LQIP placeholder URL.',
    example:     'https://res.cloudinary.com/demo/image/upload/w_20,q_1,e_blur:1000,f_auto/products/abc123/1718614800000',
  })
  @IsString()
  placeholderUrl!: string;

  @ApiPropertyOptional({
    description: 'Pixel width of the asset. 0 for non-image resources.',
    example:     1920,
    default:     0,
  })
  @IsInt()
  @Min(0)
  @IsOptional()
  width?: number = 0;

  @ApiPropertyOptional({
    description: 'Pixel height of the asset. 0 for non-image resources.',
    example:     1080,
    default:     0,
  })
  @IsInt()
  @Min(0)
  @IsOptional()
  height?: number = 0;

  @ApiProperty({
    description: 'File format extension reported by the storage provider.',
    example:     'jpg',
  })
  @IsString()
  format!: string;

  @ApiProperty({
    description: 'MIME type from the original uploaded file.',
    example:     'image/jpeg',
  })
  @IsString()
  mimeType!: string;

  @ApiProperty({
    description: 'File size in bytes.',
    example:     204800,
  })
  @IsInt()
  @Min(0)
  size!: number;
}
