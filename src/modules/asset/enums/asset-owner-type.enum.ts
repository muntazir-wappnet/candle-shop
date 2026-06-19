/**
 * Identifies the domain entity that owns an AssetReference.
 * Expand this enum when new entity types need asset support.
 */
export enum AssetOwnerType {
  CATEGORY        = 'CATEGORY',
  PRODUCT         = 'PRODUCT',
  PRODUCT_VARIANT = 'PRODUCT_VARIANT',
  SELLER_APPLICATION = 'SELLER_APPLICATION',
}

