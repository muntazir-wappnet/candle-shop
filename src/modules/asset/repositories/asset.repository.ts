import { Injectable } from '@nestjs/common';
import { AssetStatus, AssetOwnerType, AssetRole, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { RegisterAssetDto } from '../dto/register-asset.dto';

@Injectable()
export class AssetRepository {
  constructor(private readonly prisma: PrismaService) {}


  createAsset(dto: RegisterAssetDto) {
    return this.prisma.asset.create({
      data: {
        provider:       dto.provider ?? 'CLOUDINARY',
        publicId:       dto.publicId,
        url:            dto.url,
        optimizedUrl:   dto.optimizedUrl,
        thumbnailUrl:   dto.thumbnailUrl,
        placeholderUrl: dto.placeholderUrl,
        width:          dto.width  ?? 0,
        height:         dto.height ?? 0,
        format:         dto.format,
        mimeType:       dto.mimeType,
        size:           dto.size,
        status:         AssetStatus.TEMPORARY,
      },
    });
  }

  findAssetById(id: string) {
    return this.prisma.asset.findUnique({ where: { id } });
  }

  findAssetByPublicId(publicId: string) {
    return this.prisma.asset.findUnique({ where: { publicId } });
  }

  
  updateAssetStatus(id: string, status: AssetStatus) {
    return this.prisma.asset.update({ where: { id }, data: { status } });
  }


  updateManyAssetStatus(ids: string[], status: AssetStatus) {
    return this.prisma.asset.updateMany({
      where: { id: { in: ids } },
      data:  { status },
    });
  }

  
  findPendingDeletionAssets(olderThanDate: Date) {
    return this.prisma.asset.findMany({
      where: {
        status:    AssetStatus.PENDING_DELETION,
        updatedAt: { lt: olderThanDate },
      },
      include: { references: true },
    });
  }

  /**
   * Marks an asset as DELETED after Cloudinary deletion succeeds.
   */
  markAssetDeleted(id: string) {
    return this.prisma.asset.update({
      where: { id },
      data:  { status: AssetStatus.DELETED },
    });
  }

  /**
   * Removes multiple TEMPORARY assets and their references.
   * Used during transaction rollback to prevent orphaned Cloudinary files.
   */
  deleteAssetsByIds(ids: string[]) {
    return this.prisma.asset.deleteMany({ where: { id: { in: ids } } });
  }

  // ─── AssetReference ───────────────────────────────────────────────────────────

  createReference(data: {
    assetId:   string;
    ownerType: AssetOwnerType;
    ownerId:   string;
    role:      AssetRole;
    sortOrder: number;
    isPrimary: boolean;
  }) {
    return this.prisma.assetReference.create({ data });
  }

  /**
   * Creates multiple AssetReference rows in a single transaction-aware call.
   * Returns count only — individual rows are fetched separately if needed.
   */
  createManyReferences(
    data: Array<{
      assetId:   string;
      ownerType: AssetOwnerType;
      ownerId:   string;
      role:      AssetRole;
      sortOrder: number;
      isPrimary: boolean;
    }>,
  ) {
    return this.prisma.assetReference.createMany({ data });
  }

  findReferenceById(id: string) {
    return this.prisma.assetReference.findUnique({
      where:   { id },
      include: { asset: true },
    });
  }

  /**
   * Returns all AssetReferences for an owner, with nested Asset data.
   * Used by getOwnerAssets() in AssetService.
   */
  findReferencesByOwner(ownerType: AssetOwnerType, ownerId: string) {
    return this.prisma.assetReference.findMany({
      where:   { ownerType, ownerId },
      include: { asset: true },
      orderBy: [{ role: 'asc' }, { sortOrder: 'asc' }],
    });
  }

  /**
   * Returns all AssetReferences for an owner filtered by role.
   */
  findReferencesByOwnerAndRole(
    ownerType: AssetOwnerType,
    ownerId:   string,
    role:      AssetRole,
  ) {
    return this.prisma.assetReference.findMany({
      where:   { ownerType, ownerId, role },
      include: { asset: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  /**
   * Returns the primary asset reference for an owner+role combination.
   */
  findPrimaryReference(
    ownerType: AssetOwnerType,
    ownerId:   string,
    role:      AssetRole,
  ) {
    return this.prisma.assetReference.findFirst({
      where:   { ownerType, ownerId, role, isPrimary: true },
      include: { asset: true },
    });
  }

  /**
   * Unsets isPrimary on ALL references for owner+role, then sets it
   * on the specified reference. Ensures at-most-one primary invariant.
   * Must be called inside a Prisma transaction.
   */
  async setPrimaryWithinTransaction(
    tx: Prisma.TransactionClient,
    ownerType: AssetOwnerType,
    ownerId:   string,
    role:      AssetRole,
    referenceId: string,
  ) {
    await tx.assetReference.updateMany({
      where: { ownerType, ownerId, role },
      data:  { isPrimary: false },
    });
    return tx.assetReference.update({
      where: { id: referenceId },
      data:  { isPrimary: true },
    });
  }

  deleteReference(id: string) {
    return this.prisma.assetReference.delete({ where: { id } });
  }

  /**
   * Deletes all AssetReference rows for a set of asset IDs.
   * Called during cleanup before marking the asset DELETED.
   */
  deleteReferencesByAssetIds(assetIds: string[]) {
    return this.prisma.assetReference.deleteMany({
      where: { assetId: { in: assetIds } },
    });
  }

  /**
   * Deletes all AssetReferences for an owner+role.
   * Returns the IDs of the assets that were referenced (for scheduling deletion).
   */
  async deleteReferencesByOwnerAndRole(
    ownerType: AssetOwnerType,
    ownerId:   string,
    role:      AssetRole,
  ): Promise<string[]> {
    const existing = await this.prisma.assetReference.findMany({
      where:  { ownerType, ownerId, role },
      select: { assetId: true },
    });

    const assetIds = existing.map((r) => r.assetId);

    if (assetIds.length > 0) {
      await this.prisma.assetReference.deleteMany({
        where: { ownerType, ownerId, role },
      });
    }

    return assetIds;
  }

  /**
   * Counts how many references still exist for a given asset.
   * Used to determine if an asset can be safely scheduled for deletion.
   */
  countReferencesByAsset(assetId: string) {
    return this.prisma.assetReference.count({ where: { assetId } });
  }
}
