import { Module } from '@nestjs/common';
import { SellerApplicationController } from './controllers/seller-application.controller';
import { AdminSellerApplicationController } from './controllers/admin-seller-application.controller';
import { SellerApplicationService } from './services/seller-application.service';
import { SellerService } from './services/seller.service';
import { CommerceProfileService } from './services/commerce-profile.service';
import { SellerApplicationRepository } from './repositories/seller-application.repository';
import { SellerRepository } from './repositories/seller.repository';
import { AssetModule } from '../asset/asset.module';
import { MediaModule } from '../media/media.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [AssetModule, MediaModule, NotificationModule],
  controllers: [
    SellerApplicationController,
    AdminSellerApplicationController,
  ],
  providers: [
    SellerApplicationRepository,
    SellerRepository,
    SellerApplicationService,
    SellerService,
    CommerceProfileService,
  ],
  exports: [CommerceProfileService],
})
export class SellerModule {}
