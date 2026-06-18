import { AssetOwnerType, AssetRole } from '@prisma/client';

export interface IAssetOwner {
  ownerType: AssetOwnerType;
  ownerId:   string;
}


export interface IAssetOwnerContext extends IAssetOwner {
  role: AssetRole;
}
