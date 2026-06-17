import { MediaValidationException } from '../exceptions/media.exceptions';
import {
  DEFAULT_ALLOWED_MIME_TYPES,
  DEFAULT_MAX_FILE_SIZE_MB,
} from '../constants/media.constants';


export function validateMimeType(
  mimeType: string,
  allowedTypes: string[] = DEFAULT_ALLOWED_MIME_TYPES,
): void {
  if (!allowedTypes.includes(mimeType)) {
    throw new MediaValidationException(
      `Unsupported file type "${mimeType}". ` +
      `Allowed types: ${allowedTypes.join(', ')}.`,
    );
  }
}


export function validateFileSize(
  sizeBytes: number,
  maxMb: number = DEFAULT_MAX_FILE_SIZE_MB,
): void {
  if (!sizeBytes || sizeBytes === 0) {
    throw new MediaValidationException('Cannot upload an empty file.');
  }

  const maxBytes = maxMb * 1024 * 1024;

  if (sizeBytes > maxBytes) {
    throw new MediaValidationException(
      `File size ${(sizeBytes / 1024 / 1024).toFixed(2)} MB ` +
      `exceeds the maximum allowed size of ${maxMb} MB.`,
    );
  }
}

export function validateMediaFile(
  mimeType: string,
  sizeBytes: number,
  allowedTypes?: string[],
  maxMb?: number,
): void {
  validateMimeType(mimeType, allowedTypes);
  validateFileSize(sizeBytes, maxMb);
}
