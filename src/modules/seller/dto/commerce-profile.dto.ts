import { ApiPropertyOptional } from '@nestjs/swagger';
import { SellerApplicationResponseDto } from './seller-application-response.dto';
import { SellerResponseDto } from './seller-response.dto';

/**
 * Merged into login / profile / session responses via CommerceProfileService.
 * Both fields are nullable — a CUSTOMER with no seller journey returns nulls.
 */
export class CommerceProfileDto {
  @ApiPropertyOptional({ type: SellerResponseDto, nullable: true })
  seller!: SellerResponseDto | null;

  @ApiPropertyOptional({ type: SellerApplicationResponseDto, nullable: true })
  sellerApplication!: SellerApplicationResponseDto | null;
}
