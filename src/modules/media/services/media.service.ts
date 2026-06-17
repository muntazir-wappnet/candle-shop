import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { IStorageProvider } from '../interfaces/storage-provider.interface';
import type { IMediaResponse } from '../interfaces/media-response.interface';
import {
  STORAGE_PROVIDER,
  DEFAULT_MAX_FILE_SIZE_MB,
  DEFAULT_ALLOWED_MIME_TYPES,
  DEFAULT_ENTITY_FOLDER,
} from '../constants/media.constants';
import { validateMediaFile } from '../validators/media-file.validator';
import { MediaEntityType } from '../enums/media-entity-type.enum';
import { MediaUrlBuilderService } from './media-url-builder.service';

export interface MulterFile {
  fieldname:    string;
  originalname: string;
  encoding:     string;
  mimetype:     string;
  buffer:       Buffer;
  size:         number;
}

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);

  private readonly maxFileSizeMb: number;
  private readonly allowedMimeTypes: string[];

  constructor(
    @Inject(STORAGE_PROVIDER)
    private readonly storageProvider: IStorageProvider,

    private readonly config: ConfigService,
    private readonly urlBuilder: MediaUrlBuilderService,
  ) {
    this.maxFileSizeMb = Number(
      this.config.get<number>('MEDIA_MAX_FILE_SIZE_MB', DEFAULT_MAX_FILE_SIZE_MB),
    );

    const envTypes = this.config.get<string>('MEDIA_ALLOWED_MIME_TYPES');
    this.allowedMimeTypes = envTypes
      ? envTypes.split(',').map((t) => t.trim())
      : DEFAULT_ALLOWED_MIME_TYPES;

    this.logger.log(
      `MediaService initialised — maxFileSizeMb: ${this.maxFileSizeMb}, ` +
      `allowedMimeTypes: [${this.allowedMimeTypes.join(', ')}]`,
    );
  }

  async uploadImage(
    file: MulterFile,
    entityType: MediaEntityType,
    entityId?: string,
  ): Promise<IMediaResponse> {
    this.validateImage(file);

    const folder   = this.generateFolderPath(entityType, entityId);
    const publicId = this.generatePublicId(entityType, entityId);

    this.logger.log(
      `Uploading "${file.originalname}" → publicId: "${publicId}"`,
    );

    const raw = await this.storageProvider.upload(file.buffer, {
      folder,
      publicId,
      mimeType: file.mimetype,
    });
  return this.enrichWithUrls(raw);
  }

  async uploadImages(
    files: MulterFile[],
    entityType: MediaEntityType,
    entityId?: string,
  ): Promise<IMediaResponse[]> {
    this.logger.log(
      `Bulk uploading ${files.length} file(s) ` +
      `for entity: ${entityType}/${entityId ?? DEFAULT_ENTITY_FOLDER}`,
    );

    return Promise.all(
      files.map((file) => this.uploadImage(file, entityType, entityId)),
    );
  }

  async deleteImage(
    publicId: string,
    resourceType: 'image' | 'video' | 'raw' = 'image',
  ): Promise<void> {
    this.logger.log(`Deleting asset: "${publicId}" [${resourceType}]`);
    await this.storageProvider.delete(publicId, resourceType);
  }

  async deleteImages(
    assets: Array<{ publicId: string; resourceType?: 'image' | 'video' | 'raw' }>,
  ): Promise<void> {
    this.logger.log(`Sequential deleting ${assets.length} asset(s)`);

    await Promise.all(
      assets.map(({ publicId, resourceType }) =>
        this.storageProvider.delete(publicId, resourceType ?? 'image'),
      ),
    );
  }


  async deleteMany(
    publicIds: string[],
    resourceType: 'image' | 'video' | 'raw' = 'image',
  ): Promise<void> {
    if (publicIds.length === 0) return;

    this.logger.log(`Bulk deleting ${publicIds.length} asset(s) via deleteMany`);
    await this.storageProvider.deleteMany(publicIds, resourceType);
  }

  validateImage(file: MulterFile): void {
    validateMediaFile(
      file.mimetype,
      file.size,
      this.allowedMimeTypes,
      this.maxFileSizeMb,
    );
  }


  generateFolderPath(entityType: MediaEntityType, entityId?: string): string {
    const segment = entityId?.trim() || DEFAULT_ENTITY_FOLDER;
    return `${entityType}/${segment}`;
  }


  generatePublicId(entityType: MediaEntityType, entityId?: string): string {
    const folder    = this.generateFolderPath(entityType, entityId);
    const timestamp = Date.now();
    return `${folder}/${timestamp}`;
  }

  getOriginalUrl(publicId: string): string {
    return this.urlBuilder.original(publicId);
  }

  getOptimizedUrl(publicId: string): string {
    return this.urlBuilder.optimized(publicId);
  }

  getThumbnailUrl(publicId: string): string {
    return this.urlBuilder.thumbnail(publicId);
  }

  
  getPlaceholderUrl(publicId: string): string {
    return this.urlBuilder.placeholder(publicId);
  }

  private enrichWithUrls(raw: IMediaResponse): IMediaResponse {
    const urls = this.urlBuilder.buildAll(raw.publicId);

    return {
      ...raw,
      url:            urls.url,            // override with builder-generated URL
      optimizedUrl:   urls.optimizedUrl,
      thumbnailUrl:   urls.thumbnailUrl,
      placeholderUrl: urls.placeholderUrl,
    };
  }
}
