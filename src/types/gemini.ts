export interface GeminiEditRequest {
  imageBase64: string;        // Original image as base64
  maskBase64?: string;        // Optional mask (white = edit area)
  prompt: string;             // User's edit instruction
  preserveExif: boolean;      // Should preserve EXIF after edit
  originalExifDump?: string;  // piexifjs dump for re-injection
}

export interface GeminiEditResponse {
  success: boolean;
  editedImageBase64?: string;
  error?: string;
  processingTimeMs?: number;
}

export interface MaskRegion {
  type: 'freeform' | 'rectangle' | 'lasso';
  points?: Array<{ x: number; y: number }>;
  bounds?: { x: number; y: number; width: number; height: number };
}

export interface EditorState {
  imageId: string;
  inpaintMaskDataUrl: string | null;  // Green zone - where AI CAN edit
  protectMaskDataUrl: string | null;  // Red zone - where AI CANNOT edit
  prompt: string;
  isProcessing: boolean;
  previewUrl: string | null;
  error: string | null;
}
