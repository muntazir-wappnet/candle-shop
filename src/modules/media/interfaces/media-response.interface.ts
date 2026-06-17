export interface IMediaResponse {
  publicId: string;
  url: string;
  optimizedUrl: string;
  thumbnailUrl: string;
  placeholderUrl: string;
  width: number;
  height: number;
  format: string;
  size: number;
  resourceType: 'image' | 'video' | 'raw';
}
