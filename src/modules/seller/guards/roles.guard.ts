import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { ROLES_KEY } from '../decorators/roles.decorator';
import type { JwtPayload } from '../../auth/strategies/jwt.strategy';

/**
 * Guards routes that require ADMIN or SUPERADMIN role.
 *
 * The JWT payload only carries { sub, email }, so this guard performs a
 * single lightweight DB read (select role only) to resolve the user's role.
 *
 * Usage:
 *   @UseGuards(JwtAuthGuard, RolesGuard)
 *   @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // No @Roles() metadata → allow all authenticated users
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const request = context.switchToHttp().getRequest<{ user?: JwtPayload }>();
    const jwtUser = request.user;

    if (!jwtUser?.sub) return false;

    const user = await this.prisma.user.findUnique({
      where: { id: jwtUser.sub },
      select: { role: true },
    });

    if (!user) return false;

    return requiredRoles.includes(user.role);
  }
}
