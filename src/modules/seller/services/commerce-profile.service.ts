import { Injectable } from '@nestjs/common';
import { SellerRepository } from '../repositories/seller.repository';
import { SellerApplicationRepository } from '../repositories/seller-application.repository';

@Injectable()
export class CommerceProfileService {
  constructor(
    private readonly sellerRepository: SellerRepository,
    private readonly sellerApplicationRepository: SellerApplicationRepository,
  ) {}

  /**
   * Returns the seller profile and latest application for a user.
   * Both fields are null if the user has never applied or been approved.
   * Designed to be merged into login / profile / session responses.
   */
  async getUserCommerceProfile(userId: string) {
    const [seller, sellerApplication] = await Promise.all([
      this.sellerRepository.findByUserId(userId),
      this.sellerApplicationRepository.findLatestByUserId(userId),
    ]);

    return { seller: seller ?? null, sellerApplication: sellerApplication ?? null };
  }
}
