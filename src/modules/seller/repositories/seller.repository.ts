import { Injectable } from '@nestjs/common';
import { Prisma, SellerStatus } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class SellerRepository {
  constructor(private readonly prisma: PrismaService) {}

  createInTx(
    tx: Prisma.TransactionClient,
    data: {
      userId: string;
      storeName: string;
      description: string;
      slug: string;
      status?: SellerStatus;
      approvedAt?: Date;
    },
  ) {
    return tx.seller.create({ data });
  }

  findByUserId(userId: string) {
    return this.prisma.seller.findUnique({ where: { userId } });
  }

  findBySlugInTx(tx: Prisma.TransactionClient, slug: string) {
    return tx.seller.findUnique({ where: { slug } });
  }

  findAllSuperAdmins() {
    return this.prisma.user.findMany({
      where: { role: 'SUPERADMIN' },
      select: { id: true, email: true, phone_number: true, name: true },
    });
  }
}
