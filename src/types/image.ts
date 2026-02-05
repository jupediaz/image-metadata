export interface ImageFile {
  id: string;
  filename: string;
  originalFilename: string;
  format: 'jpeg' | 'png' | 'heic' | 'heif' | 'webp' | 'tiff';
  mimeType: string;
  size: number;
  width: number;
  height: number;
  thumbnailUrl?: string; // Optional: may not be available for unsupported formats
  metadata: ImageMetadata | null;
  status: ProcessingStatus;
  editHistory?: EditVersion[];
  currentVersionIndex?: number;
}

export interface EditVersion {
  id: string;
  timestamp: Date;
  prompt: string;
  maskDataUrl?: string;      // The mask used for this edit
  imageUrl: string;           // URL to the edited version
  thumbnailUrl?: string;      // Thumbnail of the edited version
  originalExifDump?: string;  // Base64 EXIF dump from original
}

export type ProcessingStatus =
  | 'uploading'
  | 'processing'
  | 'ready'
  | 'editing'
  | 'converting'
  | 'ai-editing'      // AI processing with Gemini
  | 'restoring-exif'  // EXIF restoration
  | 'error';

export interface ImageMetadata {
  exif: ExifData | null;
  gps: GpsData | null;
  dates: DateData | null;
  iptc: IptcData | null;
  xmp: Record<string, unknown> | null;
  icc: Record<string, unknown> | null;
  raw: Record<string, unknown>;
}

export interface ExifData {
  make?: string;
  model?: string;
  software?: string;
  lensModel?: string;
  focalLength?: number;
  focalLengthIn35mm?: number;
  fNumber?: number;
  exposureTime?: number;
  iso?: number;
  exposureBias?: number;
  meteringMode?: string;
  whiteBalance?: string;
  flash?: string;
  colorSpace?: string;
  orientation?: number;
  imageWidth?: number;
  imageHeight?: number;
  imageDescription?: string;
  copyright?: string;
  artist?: string;
  [key: string]: unknown;
}

export interface GpsData {
  latitude: number;
  longitude: number;
  altitude?: number;
  altitudeRef?: string;
  speed?: number;
  direction?: number;
  destBearing?: number;
  timestamp?: string;
  [key: string]: unknown;
}

export interface DateData {
  dateTimeOriginal?: string;
  dateTimeDigitized?: string;
  modifyDate?: string;
  offsetTimeOriginal?: string;
  offsetTimeDigitized?: string;
  offsetTime?: string;
  [key: string]: unknown;
}

export interface IptcData {
  title?: string;
  description?: string;
  keywords?: string[];
  copyright?: string;
  creator?: string;
  city?: string;
  country?: string;
  [key: string]: unknown;
}
