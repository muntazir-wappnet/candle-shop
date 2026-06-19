import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { SellerApplicationStatus, UserRole, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { SellerApplicationRepository } from '../repositories/seller-application.repository';
import { SellerRepository } from '../repositories/seller.repository';
import { SellerService } from './seller.service';
import { SubmitApplicationDto } from '../dto/submit-application.dto';
import { MediaService, type MulterFile } from '../../media/services/media.service';
import { AssetService } from '../../asset/services/asset.service';
import { MediaEntityType } from '../../media/enums/media-entity-type.enum';
import { AppException } from '../../../common/exceptions/app.exception';
import { NotificationEvent } from '../../notification/enums/notification-event.enum';
import { AssetRole } from '../../asset/enums/asset-role.enum';
import { AssetOwnerType } from '../../asset/enums/asset-owner-type.enum';
import { NotificationService } from '../../notification/services/notification.service';

@Injectable()
export class SellerApplicationService {
  private readonly logger = new Logger(SellerApplicationService.name);

  constructor(
    private readonly repository: SellerApplicationRepository,
    private readonly sellerRepository: SellerRepository,
    private readonly sellerService: SellerService,
    private readonly mediaService: MediaService,
    private readonly assetService: AssetService,
    private readonly notificationService: NotificationService,
    private readonly prisma: PrismaService,
  ) {}

  async submitApplication(userId: string, dto: SubmitApplicationDto, file: MulterFile) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (user.role !== UserRole.CUSTOMER) throw new AppException('Only customers can apply to be a seller');
    if (!user.isVerified) throw new AppException('You must verify your account before applying');

    const existingSeller = await this.sellerRepository.findByUserId(userId);
    if (existingSeller) throw new AppException('You already have a seller profile');

    const pendingApp = await this.repository.findPendingByUserId(userId);
    if (pendingApp) throw new AppException('You already have a pending application');

    // 1. Upload file to storage (Cloudinary)
    const media = await this.mediaService.uploadImage(file, MediaEntityType.SELLER_DOCUMENTS);

    // 2. Register asset in DB (status = TEMPORARY)
    const asset = await this.assetService.registerAssetFromMedia(media, file.mimetype);

    let application;
    try {
      // 3. Create application
      application = await this.repository.create({
        userId,
        storeName: dto.storeName,
        description: dto.description,
        gstNumber: dto.gstNumber,
        instagramUrl: dto.instagramUrl,
        websiteUrl: dto.websiteUrl,
        verificationDocumentAssetId: asset.id,
      });

      // 4. Attach asset (creates AssetReference) and activate
      await this.assetService.createReference({
        assetId: asset.id,
        ownerType: AssetOwnerType.SELLER_APPLICATION,
        ownerId: application.id,
        role: AssetRole.COVER,
        isPrimary: true,
      });
      await this.assetService.activateAsset(asset.id);
    } catch (error) {
      this.logger.error(`Failed to create application for user ${userId}`, error);
      // Clean up orphaned asset if DB insert fails
      await this.assetService.cleanupOrphanedTemporaryAssets([asset.id]);
      throw new AppException('Failed to submit application');
    }

    // 5. Notify SuperAdmins (fire-and-forget)
    const superAdmins = await this.sellerRepository.findAllSuperAdmins();
    for (const admin of superAdmins) {
      this.notificationService.dispatch(
        { email: admin.email, phoneNumber: admin.phone_number },
        NotificationEvent.SELLER_APPLICATION_SUBMITTED,
        { storeName: application.storeName, applicantName: user.name }
      ).catch(e => this.logger.error('Failed to dispatch submitted notifications', e));
    }

    return application;
  }

  async getMyApplication(userId: string) {
    const app = await this.repository.findLatestByUserId(userId);
    if (!app) throw new NotFoundException('No application found');
    return app;
  }

  async getApplicationById(id: string) {
    const app = await this.repository.findById(id);
    if (!app) throw new NotFoundException('Application not found');
    return app;
  }

  async listApplications(filters: any) {
    return this.repository.findAll(filters);
  }

  async approveApplication(applicationId: string, reviewerId: string) {
    const application = await this.getApplicationById(applicationId);
    if (application.status !== SellerApplicationStatus.PENDING) {
      throw new AppException('Only PENDING applications can be approved');
    }

    const existingSeller = await this.sellerRepository.findByUserId(application.userId);
    if (existingSeller) {
      throw new AppException('User already has a seller profile');
    }

    try {
      const { seller, updatedApp } = await this.prisma.$transaction(async (tx) => {
        // Generate collision-free slug inside the transaction
        const slug = await this.sellerService.generateUniqueSlugInTx(tx, application.storeName);

        const newSeller = await this.sellerRepository.createInTx(tx, {
          userId: application.userId,
          storeName: application.storeName,
          description: application.description,
          slug,
          approvedAt: new Date(),
        });

        const updated = await this.repository.approveInTx(tx, applicationId, reviewerId);

        return { seller: newSeller, updatedApp: updated };
      });

      // Notify Applicant (fire-and-forget)
      const applicant = await this.prisma.user.findUnique({ where: { id: application.userId } });
      if (applicant) {
        this.notificationService.dispatch(
          { email: applicant.email, phoneNumber: applicant.phone_number },
          NotificationEvent.SELLER_APPROVED,
          { storeName: updatedApp.storeName, applicantName: applicant.name }
        ).catch(e => this.logger.error('Failed to dispatch approval notification', e));
      }

      return { seller, application: updatedApp };
    } catch (error) {
      this.logger.error(`Approval failed for application ${applicationId}`, error);
      throw new AppException('Failed to approve application');
    }
  }

  async rejectApplication(applicationId: string, reviewerId: string, reason: string) {
    const application = await this.getApplicationById(applicationId);
    if (application.status !== SellerApplicationStatus.PENDING) {
      throw new AppException('Only PENDING applications can be rejected');
    }

    const updatedApp = await this.prisma.$transaction(async (tx) => {
      return this.repository.rejectInTx(tx, applicationId, reviewerId, reason);
    });

    // Notify Applicant (fire-and-forget)
    const applicant = await this.prisma.user.findUnique({ where: { id: application.userId } });
    if (applicant) {
      this.notificationService.dispatch(
        { email: applicant.email, phoneNumber: applicant.phone_number },
        NotificationEvent.SELLER_REJECTED,
        { storeName: updatedApp.storeName, applicantName: applicant.name, rejectionReason: reason }
      ).catch(e => this.logger.error('Failed to dispatch rejection notification', e));
    }

    return updatedApp;
  }
}
