import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { SellerRepository } from '../repositories/seller.repository';

@Injectable()
export class SellerService {
  constructor(private readonly sellerRepository: SellerRepository) {}

  /**
   * Converts a store name to a URL-safe slug.
   * "Luxury Candle Co!" → "luxury-candle-co"
   */
  slugify(storeName: string): string {
    return storeName
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')   // strip non-alphanumeric (except spaces/hyphens)
      .replace(/[\s_]+/g, '-')         // spaces/underscores → hyphen
      .replace(/-{2,}/g, '-')          // collapse multiple hyphens
      .replace(/^-+|-+$/g, '');        // trim leading/trailing hyphens
  }

  /**
   * Generates a unique slug within the provided transaction.
   * Running inside the approval transaction guarantees collision-safety.
   *
   * Algorithm:
   *   1. Slugify store name → base slug
   *   2. Check if it exists in the tx → if not, return
   *   3. Otherwise try base-2, base-3, ... up to 50 attempts
   */
  async generateUniqueSlugInTx(
    tx: Prisma.TransactionClient,
    storeName: string,
  ): Promise<string> {
    const base = this.slugify(storeName);
    let candidate = base;
    let suffix = 2;

    while (await this.sellerRepository.findBySlugInTx(tx, candidate)) {
      if (suffix > 50) {
        throw new Error(`Cannot generate a unique slug for store name "${storeName}" after 50 attempts`);
      }
      candidate = `${base}-${suffix}`;
      suffix++;
    }

    return candidate;
  }
}
