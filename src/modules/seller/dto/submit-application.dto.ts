import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsUrl,
  MinLength,
  MaxLength,
  Allow,
} from 'class-validator';
import { IsGstNumber } from '../validators/gst-number.validator';

export class SubmitApplicationDto {
  @ApiProperty({ example: 'Luxury Candle Co', description: 'Unique store name' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  storeName!: string;

  @ApiProperty({
    example: 'Premium hand-crafted soy candles made with natural ingredients.',
    description: 'Store description (10–1000 chars)',
  })
  @IsString()
  @MinLength(10)
  @MaxLength(1000)
  description!: string;

  @ApiPropertyOptional({ example: '22AAAAA0000A1Z5', description: 'Indian GST number (optional)' })
  @IsOptional()
  @IsString()
  @IsGstNumber()
  gstNumber?: string;

  @ApiPropertyOptional({ example: 'https://instagram.com/luxurycandleco' })
  @IsOptional()
  @IsUrl({}, { message: 'instagramUrl must be a valid URL' })
  instagramUrl?: string;

  @ApiPropertyOptional({ example: 'https://luxurycandleco.com' })
  @IsOptional()
  @IsUrl({}, { message: 'websiteUrl must be a valid URL' })
  websiteUrl?: string;

  @ApiProperty({ type: 'string', format: 'binary', description: 'Verification document (PDF/Image)' })
  @Allow()
  document!: any;
}
