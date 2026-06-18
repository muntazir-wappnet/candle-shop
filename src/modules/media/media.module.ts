import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { STORAGE_PROVIDER } from './constants/media.constants';

import { CloudinaryConfigProvider } from './providers/cloudinary/cloudinary.config';
import { CloudinaryProvider } from './providers/cloudinary/cloudinary.provider';

import { MediaUrlBuilderService } from './services/media-url-builder.service';
import { MediaService } from './services/media.service';
import { MediaController } from './controllers/media.controller';

import { AuthModule } from '../auth/auth.module';
import { AssetModule } from '../asset/asset.module';

@Module({
  imports: [
    ConfigModule,
    AuthModule,
    forwardRef(() => AssetModule),
  ],

  providers: [
    CloudinaryConfigProvider,
    CloudinaryProvider,

    // ↓ Change only this line to switch providers (S3, Azure, MinIO…) ↓
    { provide: STORAGE_PROVIDER, useClass: CloudinaryProvider },
    MediaUrlBuilderService,
    MediaService,
  ],

  controllers: [MediaController],
  exports: [MediaService, MediaUrlBuilderService],
})
export class MediaModule {}
