declare module 'piexifjs' {
  interface ExifObj {
    '0th'?: Record<number, unknown>;
    'Exif'?: Record<number, unknown>;
    'GPS'?: Record<number, unknown>;
    '1st'?: Record<number, unknown>;
    'thumbnail'?: unknown;
  }

  interface ImageIFD {
    Make: number;
    Model: number;
    [key: string]: number;
  }

  interface ExifIFD {
    DateTimeOriginal: number;
    [key: string]: number;
  }

  const piexif: {
    load(data: string): ExifObj;
    dump(exifObj: ExifObj): string;
    insert(exifDump: string, dataUrl: string): string;
    ImageIFD: ImageIFD;
    ExifIFD: ExifIFD;
  };

  export default piexif;
}
