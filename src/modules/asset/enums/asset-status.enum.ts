export enum AssetStatus {
  /** Uploaded to Cloudinary but not yet attached to any entity. */
  TEMPORARY = 'TEMPORARY',

  /** Currently in use by at least one AssetReference. */
  ACTIVE = 'ACTIVE',

  /** All references removed — queued for Cloudinary cleanup by the cron job. */
  PENDING_DELETION = 'PENDING_DELETION',

  /** Cleanup completed. Historical record only. */
  DELETED = 'DELETED',
}
