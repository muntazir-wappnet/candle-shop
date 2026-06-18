-- CreateEnum
CREATE TYPE "AssetStatus" AS ENUM ('TEMPORARY', 'ACTIVE', 'PENDING_DELETION', 'DELETED');

-- CreateEnum
CREATE TYPE "AssetProvider" AS ENUM ('CLOUDINARY');

-- CreateEnum
CREATE TYPE "AssetOwnerType" AS ENUM ('CATEGORY', 'PRODUCT', 'PRODUCT_VARIANT');

-- CreateEnum
CREATE TYPE "AssetRole" AS ENUM ('COVER', 'GALLERY');

-- CreateTable
CREATE TABLE "Asset" (
    "id" TEXT NOT NULL,
    "provider" "AssetProvider" NOT NULL DEFAULT 'CLOUDINARY',
    "publicId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "optimizedUrl" TEXT NOT NULL,
    "thumbnailUrl" TEXT NOT NULL,
    "placeholderUrl" TEXT NOT NULL,
    "width" INTEGER NOT NULL DEFAULT 0,
    "height" INTEGER NOT NULL DEFAULT 0,
    "format" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "status" "AssetStatus" NOT NULL DEFAULT 'TEMPORARY',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssetReference" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "ownerType" "AssetOwnerType" NOT NULL,
    "ownerId" TEXT NOT NULL,
    "role" "AssetRole" NOT NULL DEFAULT 'COVER',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssetReference_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Asset_publicId_key" ON "Asset"("publicId");

-- CreateIndex
CREATE INDEX "Asset_publicId_idx" ON "Asset"("publicId");

-- CreateIndex
CREATE INDEX "Asset_status_idx" ON "Asset"("status");

-- CreateIndex
CREATE INDEX "AssetReference_ownerType_ownerId_idx" ON "AssetReference"("ownerType", "ownerId");

-- AddForeignKey
ALTER TABLE "AssetReference" ADD CONSTRAINT "AssetReference_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;
