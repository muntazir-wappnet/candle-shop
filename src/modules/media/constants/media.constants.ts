
export const STORAGE_PROVIDER = 'STORAGE_PROVIDER';
export const DEFAULT_MAX_FILE_SIZE_MB = 10;

export const DEFAULT_ALLOWED_MIME_TYPES: string[] = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
  'video/mp4',
  'video/webm',
];

export const CLOUDINARY_RESOURCE_TYPE_MAP: Record<string, 'image' | 'video' | 'raw'> = {
  'image/jpeg': 'image',
  'image/png':  'image',
  'image/webp': 'image',
  'image/avif': 'image',
  'video/mp4':  'video',
  'video/webm': 'video',
};

export const DEFAULT_ENTITY_FOLDER = 'general';

export const URL_TRANSFORM_PRESETS = {
  optimized: {
    quality: 'auto' as const,
    fetch_format: 'auto' as const,
  },

  thumbnail: {
    width:        400,
    height:       400,
    crop:         'fill' as const,
    quality:      'auto' as const,
    fetch_format: 'auto' as const,
  },

  placeholder: {
    width:        20,
    quality:      1,
    effect:       'blur:1000' as const,
    fetch_format: 'auto' as const,
  },
} as const;
