import { ImageFile, ImageMetadata } from './image';

export interface UploadResponse {
  images: ImageFile[];
  sessionId: string;
}

export interface MetadataResponse {
  imageId: string;
  metadata: ImageMetadata;
}

export interface MetadataUpdateRequest {
  sessionId: string;
  imageId: string;
  changes: MetadataChange[];
}

export interface MetadataChange {
  section: 'exif' | 'gps' | 'dates' | 'iptc';
  field: string;
  value: unknown;
}

export interface ConvertRequest {
  sessionId: string;
  imageIds: string[];
  targetFormat: 'jpeg' | 'png' | 'webp';
  quality?: number;
  preserveMetadata: boolean;
}

export interface RenameRequest {
  sessionId: string;
  imageIds: string[];
  pattern: string;
  separator: string;
  startNumber: number;
}

export interface RenameResponse {
  renames: Array<{ id: string; oldName: string; newName: string }>;
}

export interface ExportRequest {
  sessionId: string;
  imageIds: string[];
  stripMetadata?: boolean;
  format?: 'jpeg' | 'png' | 'webp';
  quality?: number;
}
