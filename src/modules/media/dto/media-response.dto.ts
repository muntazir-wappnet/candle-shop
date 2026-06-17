import { ApiProperty } from '@nestjs/swagger';

export class MediaResponseDto {
  @ApiProperty({
    description: 'Provider-internal asset identifier used for deletions and URL generation.',
    example:     'products/abc123/1718614800000',
  })
  publicId!: string;

  @ApiProperty({
    description: 'Original, unmodified HTTPS URL returned by the storage provider.',
    example:     'https://res.cloudinary.com/demo/image/upload/products/abc123/1718614800000.jpg',
  })
  url!: string;

  @ApiProperty({
    description: 'Auto-quality + auto-format URL. Cloudinary chooses the best format for the browser.',
    example:     'https://res.cloudinary.com/demo/image/upload/q_auto,f_auto/products/abc123/1718614800000',
  })
  optimizedUrl!: string;

  @ApiProperty({
    description: '400×400 fill-cropped thumbnail, auto-quality, auto-format.',
    example:     'https://res.cloudinary.com/demo/image/upload/w_400,h_400,c_fill,q_auto,f_auto/products/abc123/1718614800000',
  })
  thumbnailUrl!: string;

  @ApiProperty({
    description: '20-px wide, blurred, quality-1 placeholder for LQIP (Low-Quality Image Placeholder).',
    example:     'https://res.cloudinary.com/demo/image/upload/w_20,q_1,e_blur:1000,f_auto/products/abc123/1718614800000',
  })
  placeholderUrl!: string;

  @ApiProperty({
    description: 'Pixel width of the asset. 0 for non-image resources.',
    example:     1920,
  })
  width!: number;

  @ApiProperty({
    description: 'Pixel height of the asset. 0 for non-image resources.',
    example:     1080,
  })
  height!: number;

  @ApiProperty({
    description: 'File format extension reported by the storage provider.',
    example:     'jpg',
  })
  format!: string;

  @ApiProperty({
    description: 'File size in bytes.',
    example:     204800,
  })
  size!: number;

  @ApiProperty({
    description: 'Broad category of the asset.',
    enum:        ['image', 'video', 'raw'],
    example:     'image',
  })
  resourceType!: 'image' | 'video' | 'raw';
}

export class MediaResponseListDto {
  @ApiProperty({ type: [MediaResponseDto] })
  items!: MediaResponseDto[];
}
