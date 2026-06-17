import { FactoryProvider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, ConfigOptions } from 'cloudinary';

export const CLOUDINARY_INSTANCE = 'CLOUDINARY_INSTANCE';


export const CloudinaryConfigProvider: FactoryProvider = {
  provide: CLOUDINARY_INSTANCE,
  inject:  [ConfigService],
  useFactory: (config: ConfigService) => {
    const options: ConfigOptions = {
      cloud_name: config.getOrThrow<string>('CLOUDINARY_CLOUD_NAME'),
      api_key:    config.getOrThrow<string>('CLOUDINARY_API_KEY'),
      api_secret: config.getOrThrow<string>('CLOUDINARY_API_SECRET'),
      secure:     true, // Always return HTTPS URLs
    };

    cloudinary.config(options);

    return cloudinary;
  },
};
