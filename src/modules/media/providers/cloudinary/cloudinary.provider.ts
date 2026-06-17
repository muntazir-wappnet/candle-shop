import { Inject, Injectable, Logger } from '@nestjs/common';
import { PassThrough } from 'stream';
import { v2 as CloudinaryType, UploadApiResponse, UploadApiOptions } from 'cloudinary';
import type {
  IStorageProvider,
  UploadOptions,
} from '../../interfaces/storage-provider.interface';
import type { IMediaResponse } from '../../interfaces/media-response.interface';
import { MediaUploadException, MediaDeleteException } from '../../exceptions/media.exceptions';
import { CLOUDINARY_INSTANCE } from './cloudinary.config';
import { CLOUDINARY_RESOURCE_TYPE_MAP } from '../../constants/media.constants';

@Injectable()
export class CloudinaryProvider implements IStorageProvider {
  private readonly logger = new Logger(CloudinaryProvider.name);

  constructor(
    @Inject(CLOUDINARY_INSTANCE)
    private readonly cloudinary: typeof CloudinaryType,
  ) {}

  async upload(buffer: Buffer, options: UploadOptions): Promise<IMediaResponse> {
    const resourceType = CLOUDINARY_RESOURCE_TYPE_MAP[options.mimeType] ?? 'raw';

    this.logger.log(
      `Uploading to Cloudinary — publicId: "${options.publicId}", resourceType: "${resourceType}"`,
    );

    try {
      const result = await this.streamUpload(buffer, {
        public_id:     options.publicId,
        resource_type: resourceType,
        overwrite:     true,
        format:        undefined, // Preserve original format, no conversion
      });

      return this.normalise(result, resourceType);
    } catch (error) {
      this.logger.error('Cloudinary upload failed', error);
      throw new MediaUploadException(
        `Cloudinary upload failed: ${(error as Error).message}`,
      );
    }
  }
  async delete(
    publicId: string,
    resourceType: 'image' | 'video' | 'raw' = 'image',
  ): Promise<void> {
    this.logger.log(
      `Deleting from Cloudinary — publicId: "${publicId}", resourceType: "${resourceType}"`,
    );

    try {
      const result = await this.cloudinary.uploader.destroy(publicId, {
        resource_type: resourceType,
      });

      if (result.result !== 'ok') {
        throw new Error(`Unexpected Cloudinary delete result: "${result.result}"`);
      }
    } catch (error) {
      this.logger.error('Cloudinary delete failed', error);
      throw new MediaDeleteException(
        `Cloudinary delete failed: ${(error as Error).message}`,
      );
    }
  }
 
  async deleteMany(
    publicIds: string[],
    resourceType: 'image' | 'video' | 'raw' = 'image',
  ): Promise<void> {
    if (publicIds.length === 0) return;

    this.logger.log(
      `Bulk deleting ${publicIds.length} asset(s) from Cloudinary [${resourceType}]`,
    );

    const CHUNK_SIZE = 100;
    const chunks: string[][] = [];

    for (let i = 0; i < publicIds.length; i += CHUNK_SIZE) {
      chunks.push(publicIds.slice(i, i + CHUNK_SIZE));
    }

    try {
      await Promise.all(
        chunks.map((chunk) =>
          this.cloudinary.api.delete_resources(chunk, {
            resource_type: resourceType,
          }),
        ),
      );
    } catch (error) {
      this.logger.error('Cloudinary bulk delete failed', error);
      throw new MediaDeleteException(
        `Cloudinary bulk delete failed: ${(error as Error).message}`,
      );
    }
  }

  private streamUpload(
    buffer: Buffer,
    uploadOptions: UploadApiOptions,
  ): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      const stream = this.cloudinary.uploader.upload_stream(
        uploadOptions,
        (error, result) => {
          if (error) return reject(error);
          if (!result) return reject(new Error('No response from Cloudinary'));
          resolve(result);
        },
      );

      const passThrough = new PassThrough();
      passThrough.pipe(stream);
      passThrough.end(buffer);
    });
  }


  private normalise(
    result: UploadApiResponse,
    resourceType: 'image' | 'video' | 'raw',
  ): IMediaResponse {
    return {
      publicId:       result.public_id,
      url:            result.secure_url,
      // URL variants will be filled by MediaService → MediaUrlBuilderService
      optimizedUrl:   '',
      thumbnailUrl:   '',
      placeholderUrl: '',
      width:          result.width  ?? 0,
      height:         result.height ?? 0,
      format:         result.format ?? '',
      size:           result.bytes,
      resourceType,
    };
  }
}
