import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { AssetOwnerType, AssetRole } from '@prisma/client';
import { AssetService } from '../services/asset.service';
import { RegisterAssetDto } from '../dto/register-asset.dto';
import { CreateReferenceDto } from '../dto/create-reference.dto';
import { ReplaceOwnerAssetsDto } from '../dto/replace-owner-assets.dto';
import { AssetResponseDto } from '../dto/asset-response.dto';
import {
  AssetReferenceListResponseDto,
  AssetReferenceResponseDto,
} from '../dto/asset-reference-response.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ApiSuccessResponse } from '../../../common/decorators/api-success-response.decorator';
import { ApiResponseDto } from '../../../common/dto/api-response.dto';

@ApiTags('Assets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('assets')
export class AssetController {
  constructor(private readonly assetService: AssetService) {}

  // ─── Asset Registration & Activation ─────────────────────────────────────────

  @Post('register')
  @ApiOperation({
    summary:     'Register a newly uploaded asset',
    description:
      'Persists an asset record from a prior MediaService upload. ' +
      'Status is set to TEMPORARY. Call /activate after linking to an entity.',
  })
  @ApiSuccessResponse('Asset registered successfully', AssetResponseDto)
  async registerAsset(
    @Body() dto: RegisterAssetDto,
  ): Promise<ApiResponseDto<any>> {
    const asset = await this.assetService.registerAsset(dto);
    return new ApiResponseDto(true, 'Asset registered successfully', asset);
  }

  @Post(':id/activate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:     'Activate a temporary asset',
    description: 'Transitions a TEMPORARY asset to ACTIVE. Call after the owning entity has been saved.',
  })
  @ApiParam({ name: 'id', description: 'Asset ID to activate', example: 'clxyz123' })
  @ApiSuccessResponse('Asset activated successfully', AssetResponseDto)
  async activateAsset(
    @Param('id') id: string,
  ): Promise<ApiResponseDto<any>> {
    const asset = await this.assetService.activateAsset(id);
    return new ApiResponseDto(true, 'Asset activated successfully', asset);
  }

  @Post(':id/schedule-deletion')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:     'Schedule an asset for deletion',
    description: 'Transitions an asset to PENDING_DELETION. The hourly cleanup cron will physically remove it from Cloudinary after the configured threshold.',
  })
  @ApiParam({ name: 'id', description: 'Asset ID to schedule for deletion', example: 'clxyz123' })
  @ApiSuccessResponse('Asset scheduled for deletion')
  async scheduleDeletion(
    @Param('id') id: string,
  ): Promise<ApiResponseDto<any>> {
    await this.assetService.scheduleDeletion(id);
    return new ApiResponseDto(true, 'Asset scheduled for deletion');
  }

  // ─── Asset References ─────────────────────────────────────────────────────────

  @Post('references')
  @ApiOperation({
    summary:     'Create an asset reference',
    description:
      'Links an existing Asset to a domain entity (category, product, variant) ' +
      'with a specific role (COVER, GALLERY).',
  })
  @ApiSuccessResponse('Reference created successfully', AssetReferenceResponseDto)
  async createReference(
    @Body() dto: CreateReferenceDto,
  ): Promise<ApiResponseDto<any>> {
    const reference = await this.assetService.createReference(dto);
    return new ApiResponseDto(true, 'Reference created successfully', reference);
  }

  @Delete('references/:referenceId')
  @ApiOperation({
    summary:     'Remove an asset reference',
    description:
      'Deletes the specified AssetReference. If the asset has no remaining ' +
      'references, it is automatically scheduled for Cloudinary deletion.',
  })
  @ApiParam({
    name:        'referenceId',
    description: 'AssetReference ID to remove',
    example:     'clref789',
  })
  @ApiSuccessResponse('Reference removed successfully')
  async removeReference(
    @Param('referenceId') referenceId: string,
  ): Promise<ApiResponseDto<any>> {
    await this.assetService.removeReference(referenceId);
    return new ApiResponseDto(true, 'Reference removed successfully');
  }

  // ─── Owner Asset Queries ──────────────────────────────────────────────────────

  @Get('owner/:ownerType/:ownerId')
  @ApiOperation({
    summary:     'Get all assets for an owner',
    description: 'Returns all AssetReferences (with nested Asset data) for a given entity.',
  })
  @ApiParam({
    name:     'ownerType',
    enum:     AssetOwnerType,
    example:  AssetOwnerType.PRODUCT,
  })
  @ApiParam({
    name:    'ownerId',
    example: 'clproduct456',
  })
  @ApiSuccessResponse('Owner assets retrieved', AssetReferenceListResponseDto)
  async getOwnerAssets(
    @Param('ownerType') ownerType: AssetOwnerType,
    @Param('ownerId')   ownerId:   string,
  ): Promise<ApiResponseDto<any>> {
    const references = await this.assetService.getOwnerAssets(ownerType, ownerId);
    return new ApiResponseDto(true, 'Owner assets retrieved', { items: references });
  }

  @Get('owner/:ownerType/:ownerId/primary')
  @ApiOperation({
    summary:     'Get the primary asset for an owner + role',
    description: 'Returns the AssetReference marked isPrimary=true for the given owner and role, or null.',
  })
  @ApiParam({ name: 'ownerType', enum: AssetOwnerType })
  @ApiParam({ name: 'ownerId',   example: 'clproduct456' })
  @ApiQuery({
    name:     'role',
    enum:     AssetRole,
    required: false,
    description: 'Asset role to query (defaults to COVER).',
  })
  @ApiSuccessResponse('Primary asset retrieved', AssetReferenceResponseDto)
  async getPrimaryAsset(
    @Param('ownerType') ownerType: AssetOwnerType,
    @Param('ownerId')   ownerId:   string,
    @Query('role')      role:      AssetRole = AssetRole.COVER,
  ): Promise<ApiResponseDto<any>> {
    const reference = await this.assetService.getPrimaryAsset(
      ownerType,
      ownerId,
      role,
    );
    return new ApiResponseDto(true, 'Primary asset retrieved', reference ?? null);
  }

  @Put('owner/:ownerType/:ownerId/primary/:referenceId')
  @ApiOperation({
    summary:     'Set the primary asset for an owner + role',
    description: 'Designates the specified AssetReference as primary, unsetting isPrimary on all others in the same role group.',
  })
  @ApiParam({ name: 'ownerType',   enum: AssetOwnerType })
  @ApiParam({ name: 'ownerId',     example: 'clproduct456' })
  @ApiParam({ name: 'referenceId', example: 'clref789' })
  @ApiQuery({
    name:     'role',
    enum:     AssetRole,
    required: false,
    description: 'Role group in which to set the primary (defaults to COVER).',
  })
  @ApiSuccessResponse('Primary asset updated')
  async setPrimaryAsset(
    @Param('ownerType')   ownerType:   AssetOwnerType,
    @Param('ownerId')     ownerId:     string,
    @Param('referenceId') referenceId: string,
    @Query('role')        role:        AssetRole = AssetRole.COVER,
  ): Promise<ApiResponseDto<any>> {
    await this.assetService.setPrimaryAsset(
      { ownerType, ownerId },
      role,
      referenceId,
    );
    return new ApiResponseDto(true, 'Primary asset updated');
  }

  // ─── Replacement ──────────────────────────────────────────────────────────────

  @Put('owner/:ownerType/:ownerId/replace')
  @ApiOperation({
    summary:     'Replace all owner assets for a role',
    description:
      'Atomically swaps all assets for the given owner + role. ' +
      'Old assets are scheduled for Cloudinary deletion after the cleanup threshold. ' +
      'New assets must be pre-registered as TEMPORARY via POST /assets/register. ' +
      'The operation is fully transactional — if it fails, uploaded temporary files are cleaned up.',
  })
  @ApiParam({ name: 'ownerType', enum: AssetOwnerType })
  @ApiParam({ name: 'ownerId',   example: 'clproduct456' })
  @ApiSuccessResponse(
    'Assets replaced successfully',
    AssetReferenceListResponseDto,
  )
  async replaceOwnerAssets(
    @Param('ownerType') ownerType: AssetOwnerType,
    @Param('ownerId')   ownerId:   string,
    @Body()             dto:       ReplaceOwnerAssetsDto,
  ): Promise<ApiResponseDto<any>> {
    const references = await this.assetService.replaceOwnerAssets(
      ownerType,
      ownerId,
      dto,
    );
    return new ApiResponseDto(true, 'Assets replaced successfully', {
      items: references,
    });
  }
}
