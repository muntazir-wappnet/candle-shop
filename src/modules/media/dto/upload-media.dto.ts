import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { MediaEntityType } from '../enums/media-entity-type.enum';

export class UploadMediaDto {

  @ApiProperty({
    enum:        MediaEntityType,
    description: 'Entity type that owns this media asset.',
    example:     MediaEntityType.PRODUCTS,
  })
  @IsEnum(MediaEntityType)
  entityType!: MediaEntityType;

  @ApiPropertyOptional({
    description: 'Optional ID of the owning entity.',
    example:     'clx123abc456',
  })
  @IsOptional()
  @IsString()
  entityId?: string;
}
