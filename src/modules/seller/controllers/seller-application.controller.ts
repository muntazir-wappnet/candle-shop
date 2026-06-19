import { Controller, Post, Get, Body, UseGuards, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { type JwtPayload } from '../../auth/strategies/jwt.strategy';
import { SellerApplicationService } from '../services/seller-application.service';
import { SubmitApplicationDto } from '../dto/submit-application.dto';
import { SellerApplicationResponseDto } from '../dto/seller-application-response.dto';
import { type MulterFile } from '../../media/services/media.service';

@ApiTags('Seller Applications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('seller-applications')
export class SellerApplicationController {
  constructor(private readonly service: SellerApplicationService) {}

  @Post()
  @ApiOperation({ summary: 'Submit a new seller application' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('document'))
  submit(
    @CurrentUser() user: JwtPayload,
    @Body() dto: SubmitApplicationDto,
    @UploadedFile() file?: MulterFile,
  ) {
    if (!file) throw new BadRequestException('Verification document is required');
    return this.service.submitApplication(user.sub, dto, file);
  }

  @Get('me')
  @ApiOperation({ summary: 'Get current user\'s latest application' })
  getMyApplication(@CurrentUser() user: JwtPayload) {
    return this.service.getMyApplication(user.sub);
  }
}
