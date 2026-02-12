import exifr from 'exifr';
import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFile, unlink } from 'fs/promises';
import path from 'path';
import os from 'os';
import type { ImageMetadata, ExifData, GpsData, DateData, IptcData } from '@/types/image';

const execAsync = promisify(exec);

export async function readAllMetadata(buffer: Buffer, format?: string): Promise<ImageMetadata> {
  // For HEIC/HEIF files, use ExifTool (better support)
  if (format === 'heic' || format === 'heif') {
    return readHeicMetadata(buffer);
  }

  // For other formats, use exifr
  const [flat, gps] = await Promise.all([
    exifr.parse(buffer, true).catch(() => null),
    exifr.gps(buffer).catch(() => null),
  ]);

  if (!flat) {
    return { exif: null, gps: null, dates: null, iptc: null, xmp: null, icc: null, raw: {} };
  }

  const exifData = extractExifData(flat);
  const gpsData = extractGpsData(flat, gps);
  const dateData = extractDateData(flat);
  const iptcData = extractIptcData(flat);

  // Build raw: include all fields as-is
  const raw: Record<string, unknown> = { all: { ...flat } };

  return {
    exif: exifData,
    gps: gpsData,
    dates: dateData,
    iptc: iptcData,
    xmp: null,
    icc: null,
    raw,
  };
}

async function readHeicMetadata(buffer: Buffer): Promise<ImageMetadata> {
  const tempFile = path.join(os.tmpdir(), `metadata-${Date.now()}.heic`);

  try {
    // Write buffer to temp file
    await writeFile(tempFile, buffer);

    // Use ExifTool to extract metadata as JSON with timeout
    const { stdout } = await execAsync(`exiftool -json -a -G1 "${tempFile}"`, {
      timeout: 10000, // 10 second timeout
      maxBuffer: 10 * 1024 * 1024 // 10MB buffer
    });
    const data = JSON.parse(stdout);
    const flat = data[0] || {};

    // Clean up temp file
    await unlink(tempFile).catch(() => {});

    // Extract GPS coordinates manually
    const lat = parseGpsCoordinate(flat['EXIF:GPSLatitude'], flat['EXIF:GPSLatitudeRef']);
    const lon = parseGpsCoordinate(flat['EXIF:GPSLongitude'], flat['EXIF:GPSLongitudeRef']);
    const gps = lat !== null && lon !== null ? { latitude: lat, longitude: lon } : null;

    const exifData = extractExifData(flat);
    const gpsData = extractGpsData(flat, gps);
    const dateData = extractDateData(flat);
    const iptcData = extractIptcData(flat);

    // Build raw: include all fields as-is
    const raw: Record<string, unknown> = { all: { ...flat } };

    return {
      exif: exifData,
      gps: gpsData,
      dates: dateData,
      iptc: iptcData,
      xmp: null,
      icc: null,
      raw,
    };
  } catch (error) {
    console.error('Error reading HEIC metadata:', error);
    await unlink(tempFile).catch(() => {});
    return { exif: null, gps: null, dates: null, iptc: null, xmp: null, icc: null, raw: {} };
  }
}

function parseGpsCoordinate(coord: string | undefined, ref: string | undefined): number | null {
  if (!coord || !ref) return null;

  try {
    // ExifTool format: "37 deg 23' 14.39\" N"
    const match = coord.match(/(\d+)\s+deg\s+(\d+)'\s+([\d.]+)"/);
    if (!match) return null;

    const degrees = parseFloat(match[1]);
    const minutes = parseFloat(match[2]);
    const seconds = parseFloat(match[3]);

    let decimal = degrees + minutes / 60 + seconds / 3600;

    // Apply reference (S and W are negative)
    if (ref === 'S' || ref === 'W') {
      decimal = -decimal;
    }

    return decimal;
  } catch {
    return null;
  }
}

function extractExifData(flat: Record<string, unknown>): ExifData | null {
  const data: ExifData = {};

  // Helper to get value from either exifr format or ExifTool format
  const get = (...keys: string[]) => {
    for (const key of keys) {
      if (flat[key] !== undefined) return flat[key];
    }
    return undefined;
  };

  const make = get('Make', 'IFD0:Make', 'EXIF:Make');
  const model = get('Model', 'IFD0:Model', 'EXIF:Model');
  const software = get('Software', 'IFD0:Software', 'EXIF:Software');
  const lensModel = get('LensModel', 'EXIF:LensModel', 'ExifIFD:LensModel');
  const focalLength = get('FocalLength', 'EXIF:FocalLength', 'ExifIFD:FocalLength');
  const focalLength35 = get('FocalLengthIn35mmFormat', 'EXIF:FocalLengthIn35mmFormat', 'ExifIFD:FocalLengthIn35mmFormat');
  const fNumber = get('FNumber', 'EXIF:FNumber', 'ExifIFD:FNumber');
  const exposureTime = get('ExposureTime', 'EXIF:ExposureTime', 'ExifIFD:ExposureTime');
  const iso = get('ISO', 'EXIF:ISO', 'ExifIFD:ISO');
  const exposureBias = get('ExposureBiasValue', 'EXIF:ExposureCompensation', 'ExifIFD:ExposureCompensation');
  const meteringMode = get('MeteringMode', 'EXIF:MeteringMode', 'ExifIFD:MeteringMode');
  const whiteBalance = get('WhiteBalance', 'EXIF:WhiteBalance', 'ExifIFD:WhiteBalance');
  const flash = get('Flash', 'EXIF:Flash', 'ExifIFD:Flash');
  const colorSpace = get('ColorSpace', 'EXIF:ColorSpace', 'ExifIFD:ColorSpace');
  const orientation = get('Orientation', 'IFD0:Orientation', 'EXIF:Orientation');

  if (make) data.make = String(make);
  if (model) data.model = String(model);
  if (software) data.software = String(software);
  if (lensModel) data.lensModel = String(lensModel);
  if (focalLength) data.focalLength = parseNumericValue(focalLength);
  if (focalLength35) data.focalLengthIn35mm = parseNumericValue(focalLength35);
  if (fNumber) data.fNumber = parseNumericValue(fNumber);
  if (exposureTime) data.exposureTime = parseNumericValue(exposureTime);
  if (iso) data.iso = parseNumericValue(iso);
  if (exposureBias) data.exposureBias = parseNumericValue(exposureBias);
  if (meteringMode) data.meteringMode = String(meteringMode);
  if (whiteBalance) data.whiteBalance = String(whiteBalance);
  if (flash) data.flash = String(flash);
  if (colorSpace) data.colorSpace = String(colorSpace);
  if (orientation) data.orientation = typeof orientation === 'number' ? orientation : undefined;

  return Object.keys(data).length > 0 ? data : null;
}

function parseNumericValue(value: unknown): number | undefined {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    // Handle ExifTool format like "1/30", "5.6", "28 mm"
    const parsed = parseFloat(value);
    return isNaN(parsed) ? undefined : parsed;
  }
  return undefined;
}

function extractGpsData(
  flat: Record<string, unknown>,
  gpsCoords: { latitude: number; longitude: number } | null | undefined
): GpsData | null {
  if (!gpsCoords) return null;

  const data: GpsData = {
    latitude: gpsCoords.latitude,
    longitude: gpsCoords.longitude,
  };

  // Helper to get value from either exifr format or ExifTool format
  const get = (...keys: string[]) => {
    for (const key of keys) {
      if (flat[key] !== undefined) return flat[key];
    }
    return undefined;
  };

  const altitude = get('GPSAltitude', 'EXIF:GPSAltitude');
  const altitudeRef = get('GPSAltitudeRef', 'EXIF:GPSAltitudeRef');
  const speed = get('GPSSpeed', 'EXIF:GPSSpeed');
  const direction = get('GPSImgDirection', 'EXIF:GPSImgDirection');
  const destBearing = get('GPSDestBearing', 'EXIF:GPSDestBearing');
  const timestamp = get('GPSTimeStamp', 'EXIF:GPSTimeStamp');

  if (altitude !== undefined) data.altitude = parseNumericValue(altitude);
  if (altitudeRef !== undefined) data.altitudeRef = String(altitudeRef);
  if (speed !== undefined) data.speed = parseNumericValue(speed);
  if (direction !== undefined) data.direction = parseNumericValue(direction);
  if (destBearing !== undefined) data.destBearing = parseNumericValue(destBearing);
  if (timestamp !== undefined) data.timestamp = String(timestamp);

  return data;
}

function extractDateData(flat: Record<string, unknown>): DateData | null {
  const data: DateData = {};

  // Helper to get value from either exifr format or ExifTool format
  const get = (...keys: string[]) => {
    for (const key of keys) {
      if (flat[key] !== undefined) return flat[key];
    }
    return undefined;
  };

  const formatDate = (val: unknown): string | undefined => {
    if (!val) return undefined;
    if (val instanceof Date) return val.toISOString();
    return String(val);
  };

  const dateTimeOriginal = get('DateTimeOriginal', 'EXIF:DateTimeOriginal', 'ExifIFD:DateTimeOriginal');
  const dateTimeDigitized = get('DateTimeDigitized', 'CreateDate', 'EXIF:CreateDate', 'ExifIFD:CreateDate');
  const modifyDate = get('ModifyDate', 'DateTime', 'EXIF:ModifyDate', 'IFD0:DateTime');
  const offsetTimeOriginal = get('OffsetTimeOriginal', 'EXIF:OffsetTimeOriginal', 'ExifIFD:OffsetTimeOriginal');
  const offsetTimeDigitized = get('OffsetTimeDigitized', 'EXIF:OffsetTimeDigitized', 'ExifIFD:OffsetTimeDigitized');
  const offsetTime = get('OffsetTime', 'EXIF:OffsetTime', 'ExifIFD:OffsetTime');

  data.dateTimeOriginal = formatDate(dateTimeOriginal);
  data.dateTimeDigitized = formatDate(dateTimeDigitized);
  data.modifyDate = formatDate(modifyDate);
  data.offsetTimeOriginal = offsetTimeOriginal ? String(offsetTimeOriginal) : undefined;
  data.offsetTimeDigitized = offsetTimeDigitized ? String(offsetTimeDigitized) : undefined;
  data.offsetTime = offsetTime ? String(offsetTime) : undefined;

  const hasValues = Object.values(data).some((v) => v !== undefined);
  return hasValues ? data : null;
}

function extractIptcData(flat: Record<string, unknown>): IptcData | null {
  const data: IptcData = {};

  // Helper to get value from either exifr format or ExifTool format
  const get = (...keys: string[]) => {
    for (const key of keys) {
      if (flat[key] !== undefined) return flat[key];
    }
    return undefined;
  };

  const objectName = get('ObjectName', 'IPTC:ObjectName');
  const caption = get('Caption', 'IPTC:Caption-Abstract');
  const imageDescription = get('ImageDescription', 'IFD0:ImageDescription', 'EXIF:ImageDescription');
  const keywords = get('Keywords', 'IPTC:Keywords');
  const copyrightNotice = get('CopyrightNotice', 'Copyright', 'IPTC:CopyrightNotice', 'IFD0:Copyright');
  const creator = get('Creator', 'Artist', 'Byline', 'IPTC:By-line', 'IFD0:Artist');
  const city = get('City', 'IPTC:City');
  const country = get('Country', 'IPTC:Country-PrimaryLocationName');

  if (objectName) data.title = String(objectName);
  if (caption) data.description = String(caption);
  if (imageDescription) data.description = data.description ?? String(imageDescription);
  if (keywords) {
    data.keywords = Array.isArray(keywords) ? keywords.map(String) : [String(keywords)];
  }
  if (copyrightNotice) data.copyright = String(copyrightNotice);
  if (creator) data.creator = String(creator);
  if (city) data.city = String(city);
  if (country) data.country = String(country);

  return Object.keys(data).length > 0 ? data : null;
}
