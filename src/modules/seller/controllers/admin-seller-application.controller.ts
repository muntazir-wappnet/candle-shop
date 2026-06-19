import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { type JwtPayload } from '../../auth/strategies/jwt.strategy';
import { SellerApplicationService } from '../services/seller-application.service';
import { ListApplicationsQueryDto } from '../dto/list-applications-query.dto';
import { RejectApplicationDto } from '../dto/reject-application.dto';

@ApiTags('Admin Seller Applications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
@Controller('admin/seller-applications')
export class AdminSellerApplicationController {
  constructor(private readonly service: SellerApplicationService) {}

  @Get()
  @ApiOperation({ summary: 'List all applications (paginated & filterable)' })
  listApplications(@Query() query: ListApplicationsQueryDto) {
    return this.service.listApplications(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get application details' })
  getApplication(@Param('id') id: string) {
    return this.service.getApplicationById(id);
  }

  @Post(':id/approve')
  @ApiOperation({ summary: 'Approve application and create Seller profile' })
  approve(
    @Param('id') id: string,
    @CurrentUser() admin: JwtPayload,
  ) {
    return this.service.approveApplication(id, admin.sub);
  }

  @Post(':id/reject')
  @ApiOperation({ summary: 'Reject application' })
  reject(
    @Param('id') id: string,
    @Body() dto: RejectApplicationDto,
    @CurrentUser() admin: JwtPayload,
  ) {
    return this.service.rejectApplication(id, admin.sub, dto.rejectionReason);
  }
}
