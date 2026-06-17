
import type { IMediaResponse } from './media-response.interface';
export interface UploadOptions {
  folder: string;
  publicId: string;
  mimeType: string;
}


export interface IStorageProvider {
  upload(buffer: Buffer, options: UploadOptions): Promise<IMediaResponse>;
  delete(publicId: string, resourceType?: 'image' | 'video' | 'raw'): Promise<void>;
  deleteMany(publicIds: string[], resourceType?: 'image' | 'video' | 'raw'): Promise<void>;
}
