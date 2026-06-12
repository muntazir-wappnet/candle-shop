import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

export async function seedAdmin(
  prisma: PrismaClient,
) {
  const adminEmail =
    'muntazirbhambhera1472@gmail.com';

  const existingAdmin =
    await prisma.user.findUnique({
      where: {
        email: adminEmail,
      },
    });

  if (existingAdmin) {
    console.log(
      'Admin already exists',
    );
    return;
  }

  const hashedPassword =
    await bcrypt.hash(
      'Admin@123',
      10,
    );

  await prisma.user.create({
    data: {
      name: 'Super Admin',
      email: adminEmail,
      phone_number: '9265078250',
      password: hashedPassword,
      isVerified: true,
      role: 'SUPERADMIN',
    },
  });

  console.log(
    'Admin seeded successfully',
  );
}