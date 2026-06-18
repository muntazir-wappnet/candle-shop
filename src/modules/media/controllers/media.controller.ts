import {
  Body,
  Controller,
  Delete,
  Param,
  Post,
  Query,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { AssetService } from '../../asset/services/asset.service';
import { AssetResponseDto, AssetResponseListDto } from '../../asset/dto/asset-response.dto';
import { MediaService } from '../services/media.service';
import type { MulterFile } from '../services/media.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ApiSuccessResponse } from '../../../common/decorators/api-success-response.decorator';
import { MediaResponseListDto } from '../dto/media-response.dto';
import { MediaEntityType } from '../enums/media-entity-type.enum';
import { UploadMediaDto } from '../dto/upload-media.dto';

const MEMORY_STORAGE = memoryStorage();

@ApiTags('Media')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('media')
export class MediaController {
  constructor(
    private readonly mediaService: MediaService,
    private readonly assetService: AssetService,
  ) {}
  @Post('upload')
  @UseInterceptors(FileInterceptor('file', { storage: MEMORY_STORAGE }))
  @ApiOperation({
    summary:     'Upload a single media file',
    description: 'Uploads an image or video to the configured cloud storage provider. ' +
                 'File is validated for MIME type and size before being streamed to the provider.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type:       'object',
      required:   ['file', 'entityType'],
      properties: {
        file: {
          type:        'string',
          format:      'binary',
          description: 'The media file to upload (jpeg, png, webp, avif, mp4, webm).',
        },
        entityType: {
          type:        'string',
          enum:        Object.values(MediaEntityType),
          description: 'Entity type that owns this media asset.',
        },
        entityId: {
          type:        'string',
          description: 'Optional entity ID (e.g. product ID, user ID).',
        },
      },
    },
  })
  @ApiSuccessResponse('File uploaded successfully', AssetResponseDto)
  async uploadSingle(
    @UploadedFile() file: MulterFile,
    @Body() dto: UploadMediaDto,
  ) {
    const rawResult = await this.mediaService.uploadImage(file, dto.entityType, dto.entityId);
    const asset = await this.assetService.registerAssetFromMedia(rawResult, file.mimetype);
    return { message: 'File uploaded successfully', data: asset };
  }

  @Post('upload-multiple')
  @UseInterceptors(FilesInterceptor('files', 10, { storage: MEMORY_STORAGE }))
  @ApiOperation({
    summary:     'Upload multiple media files (max 10)',
    description: 'Uploads up to 10 images or videos concurrently. All files must pass ' +
                 'MIME type and size validation before any upload begins.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type:       'object',
      required:   ['files', 'entityType'],
      properties: {
        files: {
          type:  'array',
          items: { type: 'string', format: 'binary' },
          description: 'Array of media files to upload (max 10).',
        },
        entityType: {
          type:        'string',
          enum:        Object.values(MediaEntityType),
          description: 'Entity type that owns these media assets.',
        },
        entityId: {
          type:        'string',
          description: 'Optional entity ID applied to all uploaded files.',
        },
      },
    },
  })
  @ApiSuccessResponse('Files uploaded successfully', AssetResponseListDto)
  async uploadMultiple(
    @UploadedFiles() files: MulterFile[],
    @Body() dto: UploadMediaDto,
  ) {
    const rawResults = await this.mediaService.uploadImages(files, dto.entityType, dto.entityId);
    const assets = await Promise.all(
      rawResults.map((raw, index) => 
        this.assetService.registerAssetFromMedia(raw, files[index].mimetype)
      )
    );
    return { message: 'Files uploaded successfully', data: { items: assets } };
  }

  
  @Delete('*publicId')
  @ApiOperation({
    summary:     'Delete a media asset by public ID (Soft Delete)',
    description: 'Routes the deletion request to the Asset Module to safely ' +
                 'schedule the asset for physical deletion after the cleanup threshold elapses.',
  })
  @ApiParam({
    name:        'publicId',
    description: 'Provider public ID of the asset to delete (may contain slashes).',
    example:     'products/abc123/1718614800000',
  })
  @ApiQuery({
    name:        'resourceType',
    required:    false,
    enum:        ['image', 'video', 'raw'],
    description: 'Asset resource type. Defaults to "image".',
  })
  @ApiSuccessResponse('Asset deleted successfully')
  async deleteAsset(
    @Param('publicId') publicId: string,  // captured by *publicId wildcard
    @Query('resourceType') resourceType: 'image' | 'video' | 'raw' = 'image',
  ) {
    await this.assetService.scheduleDeletionByPublicId(publicId, resourceType);
    return { message: 'Asset deletion scheduled successfully' };
  }
}
