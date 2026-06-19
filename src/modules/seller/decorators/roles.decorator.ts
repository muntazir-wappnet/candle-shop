import { SetMetadata } from '@nestjs/common';
import { UserRole } from '@prisma/client';

export const ROLES_KEY = 'roles';

/**
 * Attach required roles to a controller or handler.
 * Used together with RolesGuard.
 *
 * @example
 *   @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
 *   @UseGuards(JwtAuthGuard, RolesGuard)
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
