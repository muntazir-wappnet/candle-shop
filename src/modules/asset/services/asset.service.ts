import {
  Injectable,
  Logger,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { AssetOwnerType, AssetRole, AssetStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { MediaService } from '../../media/services/media.service';
import { AssetRepository } from '../repositories/asset.repository';
import { RegisterAssetDto } from '../dto/register-asset.dto';
import { CreateReferenceDto } from '../dto/create-reference.dto';
import { ReplaceOwnerAssetsDto } from '../dto/replace-owner-assets.dto';
import { IAssetOwner } from '../interfaces/asset-owner.interface';
import { AppException } from '../../../common/exceptions/app.exception';
import type { IMediaResponse } from '../../media/interfaces/media-response.interface';

@Injectable()
export class AssetService {
  private readonly logger = new Logger(AssetService.name);

  constructor(
    private readonly assetRepository: AssetRepository,
    private readonly mediaService: MediaService,
    private readonly prisma: PrismaService,
  ) {}

  async registerAsset(dto: RegisterAssetDto) {
    const asset = await this.assetRepository.createAsset(dto);

    this.logger.log(
      `[AssetService] Registered asset "${asset.publicId}" (id: ${asset.id}) as TEMPORARY`,
    );

    return asset;
  }

  /**
   * Convenience overload for service-to-service callers who have an IMediaResponse
   * from MediaService and the mimeType from the original MulterFile.
   */
  async registerAssetFromMedia(
    media:    IMediaResponse,
    mimeType: string,
  ) {
    return this.registerAsset({
      publicId:       media.publicId,
      url:            media.url,
      optimizedUrl:   media.optimizedUrl,
      thumbnailUrl:   media.thumbnailUrl,
      placeholderUrl: media.placeholderUrl,
      width:          media.width,
      height:         media.height,
      format:         media.format,
      mimeType,
      size:           media.size,
    });
  }

  /**
   * Transitions an asset from TEMPORARY → ACTIVE.
   * Call this after the owning entity is successfully saved.
   */
  async activateAsset(assetId: string) {
    const asset = await this.assetRepository.findAssetById(assetId);
    if (!asset) {
      throw new NotFoundException(`Asset "${assetId}" not found`);
    }

    if (asset.status !== AssetStatus.TEMPORARY) {
      this.logger.warn(
        `[AssetService] activateAsset called on asset "${assetId}" with status "${asset.status}" — skipping`,
      );
      return asset;
    }

    const updated = await this.assetRepository.updateAssetStatus(
      assetId,
      AssetStatus.ACTIVE,
    );

    this.logger.log(`[AssetService] Asset "${assetId}" activated`);
    return updated;
  }

  /**
   * Transitions an asset to PENDING_DELETION.
   * The cleanup cron will physically remove it from Cloudinary after the
   * configured threshold elapses.
   */
  async scheduleDeletion(assetId: string) {
    const asset = await this.assetRepository.findAssetById(assetId);
    if (!asset) {
      this.logger.warn(
        `[AssetService] scheduleDeletion: asset "${assetId}" not found — skipping`,
      );
      return;
    }

    await this.assetRepository.updateAssetStatus(
      assetId,
      AssetStatus.PENDING_DELETION,
    );

    this.logger.log(
      `[AssetService] Asset "${assetId}" scheduled for deletion`,
    );
  }

  /**
   * Delegates a deletion request based on a public ID to the Asset Module.
   * If the asset exists in the database, it schedules it for deletion (soft-delete approach).
   * If it doesn't exist, it falls back to immediate physical deletion to prevent untracked orphaned files.
   */
  async scheduleDeletionByPublicId(
    publicId:     string,
    resourceType: 'image' | 'video' | 'raw' = 'image',
  ) {
    const asset = await this.assetRepository.findAssetByPublicId(publicId);
    
    if (!asset) {
      this.logger.warn(
        `[AssetService] scheduleDeletionByPublicId: asset with publicId "${publicId}" not found in DB. Deleting from storage directly as fallback.`,
      );
      await this.mediaService.deleteImage(publicId, resourceType);
      return;
    }

    await this.scheduleDeletion(asset.id);
  }

  
  async cleanupOrphanedTemporaryAssets(assetIds: string[]): Promise<void> {
    if (assetIds.length === 0) return;

    this.logger.warn(
      `[AssetService] Rolling back ${assetIds.length} temporary asset(s): [${assetIds.join(', ')}]`,
    );

    try {
      const assets = await Promise.all(
        assetIds.map((id) => this.assetRepository.findAssetById(id)),
      );

      const validAssets = assets.filter(
        (a): a is NonNullable<typeof a> =>
          a !== null && a.status === AssetStatus.TEMPORARY,
      );

      if (validAssets.length > 0) {
        await this.mediaService.deleteImages(
          validAssets.map((a) => ({ publicId: a.publicId, resourceType: 'image' as const })),
        );
        await this.assetRepository.deleteAssetsByIds(
          validAssets.map((a) => a.id),
        );
      }
    } catch (err) {
      this.logger.error(
        `[AssetService] cleanupOrphanedTemporaryAssets failed: ${(err as Error).message}`,
      );
    }
  }

  // ─── References ──────────────────────────────────────────────────────────────

  /**
   * Creates an AssetReference linking an Asset to a domain entity.
   * The asset must exist and be TEMPORARY or ACTIVE.
   */
  async createReference(dto: CreateReferenceDto) {
    const asset = await this.assetRepository.findAssetById(dto.assetId);
    if (!asset) {
      throw new NotFoundException(`Asset "${dto.assetId}" not found`);
    }

    const reference = await this.assetRepository.createReference({
      assetId:   dto.assetId,
      ownerType: dto.ownerType,
      ownerId:   dto.ownerId,
      role:      dto.role,
      sortOrder: dto.sortOrder ?? 0,
      isPrimary: dto.isPrimary ?? false,
    });

    this.logger.log(
      `[AssetService] Reference created: asset "${dto.assetId}" → ${dto.ownerType}/${dto.ownerId} [${dto.role}]`,
    );

    return reference;
  }

  /**
   * Removes an AssetReference by its ID.
   * If the referenced asset has no remaining references, it is scheduled for deletion.
   */
  async removeReference(referenceId: string): Promise<void> {
    const reference = await this.assetRepository.findReferenceById(referenceId);
    if (!reference) {
      throw new NotFoundException(`AssetReference "${referenceId}" not found`);
    }

    await this.assetRepository.deleteReference(referenceId);

    this.logger.log(
      `[AssetService] Removed reference "${referenceId}" (asset: "${reference.assetId}")`,
    );

    // Schedule asset for deletion if it has no remaining references
    const remainingCount = await this.assetRepository.countReferencesByAsset(
      reference.assetId,
    );

    if (remainingCount === 0) {
      await this.scheduleDeletion(reference.assetId);
    }
  }

  // ─── Owner Queries ───────────────────────────────────────────────────────────

  /**
   * Returns all AssetReferences (with nested Asset) for a given owner.
   */
  getOwnerAssets(ownerType: AssetOwnerType, ownerId: string) {
    return this.assetRepository.findReferencesByOwner(ownerType, ownerId);
  }

  /**
   * Returns the primary AssetReference for an owner + role, or null.
   */
  getPrimaryAsset(
    ownerType: AssetOwnerType,
    ownerId:   string,
    role:      AssetRole,
  ) {
    return this.assetRepository.findPrimaryReference(ownerType, ownerId, role);
  }

  /**
   * Designates a specific AssetReference as primary within an owner + role group.
   * Unsets isPrimary on all other references in the same group atomically.
   */
  async setPrimaryAsset(
    owner:       IAssetOwner,
    role:        AssetRole,
    referenceId: string,
  ) {
    const reference = await this.assetRepository.findReferenceById(referenceId);
    if (!reference) {
      throw new NotFoundException(`AssetReference "${referenceId}" not found`);
    }

    if (
      reference.ownerType !== owner.ownerType ||
      reference.ownerId   !== owner.ownerId   ||
      reference.role      !== role
    ) {
      throw new AppException(
        'Reference does not belong to the specified owner/role combination.',
      );
    }

    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) =>
      this.assetRepository.setPrimaryWithinTransaction(
        tx,
        owner.ownerType,
        owner.ownerId,
        role,
        referenceId,
      ),
    );
  }

  // ─── Asset Replacement Strategy ──────────────────────────────────────────────

  /**
   * Atomically replaces all assets for an owner + role combination.
   *
   * Algorithm (transactional):
   *   1. Fetch current references → collect old asset IDs
   *   2. Delete current references
   *   3. Create new references from dto.assetIds (sortOrder = index)
   *   4. Mark new assets ACTIVE
   *   5. Mark old assets PENDING_DELETION (only if they have no other references)
   *
   * On failure:
   *   - Transaction rolls back DB changes
   *   - cleanupOrphanedTemporaryAssets() removes newly uploaded Cloudinary files
   *
   * @param ownerType  - Entity type
   * @param ownerId    - Entity primary key
   * @param dto        - Contains role + ordered list of new TEMPORARY asset IDs
   */
  async replaceOwnerAssets(
    ownerType: AssetOwnerType,
    ownerId:   string,
    dto:       ReplaceOwnerAssetsDto,
  ) {
    const { role, assetIds: newAssetIds } = dto;

    this.logger.log(
      `[AssetService] Replacing ${role} assets for ${ownerType}/${ownerId} ` +
      `with [${newAssetIds.join(', ')}]`,
    );

    // Validate all new asset IDs exist before starting the transaction
    const newAssets = await Promise.all(
      newAssetIds.map((id) => this.assetRepository.findAssetById(id)),
    );

    const missing = newAssetIds.filter((id, i) => !newAssets[i]);
    if (missing.length > 0) {
      throw new AppException(`Asset(s) not found: ${missing.join(', ')}`);
    }

    try {
      return await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        // ── 1. Fetch and collect old references ────────────────────────────
        const oldReferences = await tx.assetReference.findMany({
          where:  { ownerType, ownerId, role },
          select: { id: true, assetId: true },
        });
        const oldAssetIds = oldReferences.map((r) => r.assetId);

        // ── 2. Remove old references ───────────────────────────────────────
        if (oldReferences.length > 0) {
          await tx.assetReference.deleteMany({
            where: { ownerType, ownerId, role },
          });
        }

        // ── 3. Create new references (first is primary) ────────────────────
        await tx.assetReference.createMany({
          data: newAssetIds.map((assetId, index) => ({
            assetId,
            ownerType,
            ownerId,
            role,
            sortOrder: index,
            isPrimary: index === 0,
          })),
        });

        // ── 4. Activate new assets ─────────────────────────────────────────
        await tx.asset.updateMany({
          where: { id: { in: newAssetIds } },
          data:  { status: AssetStatus.ACTIVE },
        });

        // ── 5. Schedule old assets for deletion (only if now orphaned) ─────
        if (oldAssetIds.length > 0) {
          // Find old assets that still have references elsewhere
          const stillReferenced = await tx.assetReference.findMany({
            where:  { assetId: { in: oldAssetIds } },
            select: { assetId: true },
          });
          const stillReferencedIds = new Set(
            stillReferenced.map((r) => r.assetId),
          );
          const orphanedIds = oldAssetIds.filter(
            (id) => !stillReferencedIds.has(id),
          );

          if (orphanedIds.length > 0) {
            await tx.asset.updateMany({
              where: { id: { in: orphanedIds } },
              data:  { status: AssetStatus.PENDING_DELETION },
            });

            this.logger.log(
              `[AssetService] Scheduled ${orphanedIds.length} old asset(s) for deletion`,
            );
          }
        }

        // Return the newly created references with their assets
        return tx.assetReference.findMany({
          where:   { ownerType, ownerId, role },
          include: { asset: true },
          orderBy: { sortOrder: 'asc' },
        });
      });
    } catch (err) {
      this.logger.error(
        `[AssetService] replaceOwnerAssets transaction failed: ${(err as Error).message}`,
      );

      // Rollback: remove orphaned Cloudinary files for the failed new uploads
      await this.cleanupOrphanedTemporaryAssets(newAssetIds);

      throw new InternalServerErrorException(
        'Asset replacement failed. Uploaded files have been cleaned up.',
      );
    }
  }
}
