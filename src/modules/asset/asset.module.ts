import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { MediaModule } from '../media/media.module';

import { AssetRepository } from './repositories/asset.repository';
import { AssetService } from './services/asset.service';
import { AssetCleanupService } from './services/asset-cleanup.service';
import { AssetController } from './controllers/asset.controller';

@Module({
  imports: [
    ConfigModule,
    forwardRef(() => MediaModule), // Provides MediaService (for cleanup) and MediaUrlBuilderService
  ],

  providers: [
    AssetRepository,
    AssetService,
    AssetCleanupService,
  ],

  controllers: [AssetController],
  exports: [AssetService],
})
export class AssetModule {}
