import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class AuthRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  findByNumber(phone_number: string) {
    return this.prisma.user.findUnique({
      where: { phone_number: phone_number },
    });
  }

  create(data: {
    name: string;
    email: string;
    phone_number: string;
    password: string;
  }) {
    return this.prisma.user.create({
      data,
    });
  }

  findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  updateVerificationStatus(id: string, isVerified: boolean) {
    return this.prisma.user.update({
      where: { id },
      data: { isVerified },
    });
  }
}