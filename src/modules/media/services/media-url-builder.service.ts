 import { Inject, Injectable, Logger } from '@nestjs/common';
import { v2 as CloudinaryType } from 'cloudinary';
import { CLOUDINARY_INSTANCE } from '../providers/cloudinary/cloudinary.config';
import { URL_TRANSFORM_PRESETS } from '../constants/media.constants';

@Injectable()
export class MediaUrlBuilderService {
  private readonly logger = new Logger(MediaUrlBuilderService.name);

  constructor(
    @Inject(CLOUDINARY_INSTANCE)
    private readonly cloudinary: typeof CloudinaryType,
  ) {}

  original(publicId: string): string {
    return this.cloudinary.url(publicId, { secure: true });
  }
  optimized(publicId: string): string {
    const { quality, fetch_format } = URL_TRANSFORM_PRESETS.optimized;

    return this.cloudinary.url(publicId, {
      secure:       true,
      quality,
      fetch_format,
    });
  }

  thumbnail(publicId: string): string {
    const { width, height, crop, quality, fetch_format } = URL_TRANSFORM_PRESETS.thumbnail;

    return this.cloudinary.url(publicId, {
      secure:       true,
      width,
      height,
      crop,
      quality,
      fetch_format,
    });
  }

  
  placeholder(publicId: string): string {
    const { width, quality, effect, fetch_format } = URL_TRANSFORM_PRESETS.placeholder;

    return this.cloudinary.url(publicId, {
      secure:       true,
      width,
      quality,
      effect,
      fetch_format,
    });
  }

  
  buildAll(publicId: string): {
    url:            string;
    optimizedUrl:   string;
    thumbnailUrl:   string;
    placeholderUrl: string;
  } {
    this.logger.debug(`Building URL variants for publicId: "${publicId}"`);

    return {
      url:            this.original(publicId),
      optimizedUrl:   this.optimized(publicId),
      thumbnailUrl:   this.thumbnail(publicId),
      placeholderUrl: this.placeholder(publicId),
    };
  }
}
