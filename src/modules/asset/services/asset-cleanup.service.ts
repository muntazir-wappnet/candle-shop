import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { AssetStatus } from '@prisma/client';
import { AssetRepository } from '../repositories/asset.repository';
import { MediaService } from '../../media/services/media.service';
import {
  ASSET_CLEANUP_THRESHOLD_ENV_KEY,
  DEFAULT_CLEANUP_THRESHOLD_HOURS,
} from '../constants/asset.constants';


@Injectable()
export class AssetCleanupService {
  private readonly logger = new Logger(AssetCleanupService.name);
  private readonly thresholdHours: number;

  constructor(
    private readonly assetRepository: AssetRepository,
    private readonly mediaService: MediaService,
    private readonly config: ConfigService,
  ) {
    this.thresholdHours = Number(
      this.config.get<number>(
        ASSET_CLEANUP_THRESHOLD_ENV_KEY,
        DEFAULT_CLEANUP_THRESHOLD_HOURS,
      ),
    );

    this.logger.log(
      `[AssetCleanup] Initialised — threshold: ${this.thresholdHours}h`,
    );
  }

  // ─── Cron Trigger ────────────────────────────────────────────────────────────

  /**
   * Runs every hour. Finds all PENDING_DELETION assets older than the threshold
   * and deletes them from Cloudinary + marks them DELETED in the database.
   */
  @Cron(CronExpression.EVERY_HOUR)
  async cleanupPendingAssets(): Promise<void> {
    this.logger.log('[AssetCleanup] Scheduled cleanup started');

    const thresholdDate = new Date(
      Date.now() - this.thresholdHours * 60 * 60 * 1000,
    );

    const pendingAssets = await this.assetRepository.findPendingDeletionAssets(
      thresholdDate,
    );

    if (pendingAssets.length === 0) {
      this.logger.log('[AssetCleanup] No assets pending deletion — done');
      return;
    }

    this.logger.log(
      `[AssetCleanup] Found ${pendingAssets.length} asset(s) to clean up`,
    );

    let successCount = 0;
    let failureCount = 0;

    for (const asset of pendingAssets) {
      try {
        await this.processAssetDeletion(asset.id, asset.publicId);
        successCount++;
      } catch (err) {
        failureCount++;
        this.logger.error(
          `[AssetCleanup] Failed to delete asset "${asset.id}" (publicId: "${asset.publicId}"): ` +
          `${(err as Error).message}`,
        );
        // Continue processing remaining assets — fault isolation
      }
    }

    this.logger.log(
      `[AssetCleanup] Completed — deleted: ${successCount}, failed: ${failureCount}`,
    );
  }

  
  private async processAssetDeletion(
    assetId:  string,
    publicId: string,
  ): Promise<void> {
    this.logger.debug(
      `[AssetCleanup] Processing asset "${assetId}" (publicId: "${publicId}")`,
    );

    // Step 1: Delete from Cloudinary — tolerate "not found" as already deleted
    try {
      await this.mediaService.deleteImage(publicId, 'image');
    } catch (err) {
      const message = (err as Error).message ?? '';
      const isNotFound =
        message.toLowerCase().includes('not found') ||
        message.toLowerCase().includes('does not exist');

      if (isNotFound) {
        this.logger.warn(
          `[AssetCleanup] Cloudinary asset "${publicId}" not found — treating as already deleted`,
        );
      } else {
        throw err; // Rethrow unexpected errors
      }
    }

    // Step 2: Remove AssetReference rows
    await this.assetRepository.deleteReferencesByAssetIds([assetId]);

    // Step 3: Mark Asset as DELETED
    await this.assetRepository.markAssetDeleted(assetId);

    this.logger.log(
      `[AssetCleanup] Asset "${assetId}" successfully cleaned up`,
    );
  }
}
