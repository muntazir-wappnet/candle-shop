import { Injectable } from '@nestjs/common';
import { Prisma, SellerApplicationStatus } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

// ─── Includes ────────────────────────────────────────────────────────────────

/** Standard include set for returning a full application with relations. */
const APPLICATION_INCLUDE = {
  reviewer: { select: { id: true, name: true, email: true } },
  verificationDocumentAsset: {
    select: { id: true, url: true, optimizedUrl: true, thumbnailUrl: true },
  },
} satisfies Prisma.SellerApplicationInclude;

// ─── Repository ──────────────────────────────────────────────────────────────

@Injectable()
export class SellerApplicationRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: {
    userId: string;
    storeName: string;
    description: string;
    gstNumber?: string;
    instagramUrl?: string;
    websiteUrl?: string;
    verificationDocumentAssetId: string;
  }) {
    return this.prisma.sellerApplication.create({
      data,
      include: APPLICATION_INCLUDE,
    });
  }

  findById(id: string) {
    return this.prisma.sellerApplication.findUnique({
      where: { id },
      include: APPLICATION_INCLUDE,
    });
  }

  /** Returns the most recent application for a user regardless of status. */
  findLatestByUserId(userId: string) {
    return this.prisma.sellerApplication.findFirst({
      where: { userId },
      include: APPLICATION_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Returns the active PENDING application for a user, if any. */
  findPendingByUserId(userId: string) {
    return this.prisma.sellerApplication.findFirst({
      where: { userId, status: SellerApplicationStatus.PENDING },
    });
  }

  async findAll(filters: {
    status?: SellerApplicationStatus;
    userId?: string;
    storeName?: string;
    dateFrom?: string;
    dateTo?: string;
    page: number;
    limit: number;
  }) {
    const where: Prisma.SellerApplicationWhereInput = {};

    if (filters.status)    where.status    = filters.status;
    if (filters.userId)    where.userId    = filters.userId;
    if (filters.storeName) where.storeName = { contains: filters.storeName, mode: 'insensitive' };

    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {
        ...(filters.dateFrom ? { gte: new Date(filters.dateFrom) } : {}),
        ...(filters.dateTo   ? { lte: new Date(filters.dateTo)   } : {}),
      };
    }

    const skip  = (filters.page - 1) * filters.limit;
    const take  = filters.limit;

    const [items, total] = await Promise.all([
      this.prisma.sellerApplication.findMany({
        where,
        include: APPLICATION_INCLUDE,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.sellerApplication.count({ where }),
    ]);

    return { items, total, page: filters.page, limit: filters.limit };
  }

  /** Approves application — call inside an existing transaction. */
  approveInTx(
    tx: Prisma.TransactionClient,
    id: string,
    reviewerId: string,
  ) {
    return tx.sellerApplication.update({
      where: { id },
      data: {
        status:     SellerApplicationStatus.APPROVED,
        reviewerId,
        reviewedAt: new Date(),
      },
    });
  }

  /** Rejects application — call inside an existing transaction. */
  rejectInTx(
    tx: Prisma.TransactionClient,
    id: string,
    reviewerId: string,
    rejectionReason: string,
  ) {
    return tx.sellerApplication.update({
      where: { id },
      data: {
        status:     SellerApplicationStatus.REJECTED,
        reviewerId,
        reviewedAt: new Date(),
        rejectionReason,
      },
    });
  }
}
