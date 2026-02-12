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

export interface GeminiEditApiRequest {
  sessionId: string;
  imageId: string;
  prompt: string;
  inpaintMaskDataUrl?: string;    // Green zone: areas where AI CAN edit (white = edit, black = keep)
  protectMaskDataUrl?: string;    // Red zone: areas where AI CANNOT edit (white = protect, black = can edit)
  preserveExif: boolean;
  model?: string;                 // Gemini model to use (e.g., 'gemini-3-pro-image-preview')
}

export interface GeminiEditApiResponse {
  success: boolean;
  newVersionId: string;
  editedImageUrl: string;
  thumbnailUrl?: string;
  processingTimeMs: number;
  error?: string;
  exifDump?: string;            // Base64 EXIF dump from original (if preserveExif was true)
}

export interface ExifRestoreRequest {
  sessionId: string;
  sourceImageId: string;      // Original image with EXIF
  targetImageId: string;      // Edited image to inject EXIF into
}

export interface ExifRestoreResponse {
  success: boolean;
  metadata?: ImageMetadata;
  error?: string;
}
