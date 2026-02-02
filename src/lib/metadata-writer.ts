import sharp from 'sharp';
import { MetadataChange } from '@/types/api';

export async function applyMetadataChanges(buffer: Buffer, changes: MetadataChange[]): Promise<Buffer> {
  const exifData: Record<string, Record<string, string>> = {};

  for (const change of changes) {
    switch (change.section) {
      case 'dates':
        applyDateChange(exifData, change.field, change.value);
        break;
      case 'gps':
        applyGpsChange(exifData, change.field, change.value);
        break;
      case 'exif':
        applyExifChange(exifData, change.field, change.value);
        break;
      case 'iptc':
        // IPTC through XMP - limited support via sharp
        applyIptcChange(exifData, change.field, change.value);
        break;
    }
  }

  // Only process if we have changes to write
  if (Object.keys(exifData).length === 0) {
    return buffer;
  }

  return sharp(buffer)
    .withExifMerge(exifData)
    .withMetadata()
    .toBuffer();
}

function applyDateChange(exifData: Record<string, Record<string, string>>, field: string, value: unknown) {
  if (!exifData['IFD0']) exifData['IFD0'] = {};
  if (!exifData['EXIF']) exifData['EXIF'] = {};

  const dateStr = toExifDateString(value);
  if (!dateStr) return;

  switch (field) {
    case 'dateTimeOriginal':
      exifData['EXIF']['DateTimeOriginal'] = dateStr;
      break;
    case 'dateTimeDigitized':
      exifData['EXIF']['DateTimeDigitized'] = dateStr;
      break;
    case 'modifyDate':
      exifData['IFD0']['DateTime'] = dateStr;
      break;
    case 'offsetTimeOriginal':
      exifData['EXIF']['OffsetTimeOriginal'] = String(value);
      break;
    case 'offsetTimeDigitized':
      exifData['EXIF']['OffsetTimeDigitized'] = String(value);
      break;
    case 'offsetTime':
      exifData['EXIF']['OffsetTime'] = String(value);
      break;
  }
}

function applyGpsChange(exifData: Record<string, Record<string, string>>, field: string, value: unknown) {
  if (!exifData['GPS']) exifData['GPS'] = {};

  switch (field) {
    case 'latitude': {
      const lat = Number(value);
      exifData['GPS']['GPSLatitude'] = decimalToRational(Math.abs(lat));
      exifData['GPS']['GPSLatitudeRef'] = lat >= 0 ? 'N' : 'S';
      break;
    }
    case 'longitude': {
      const lng = Number(value);
      exifData['GPS']['GPSLongitude'] = decimalToRational(Math.abs(lng));
      exifData['GPS']['GPSLongitudeRef'] = lng >= 0 ? 'E' : 'W';
      break;
    }
    case 'altitude': {
      const alt = Number(value);
      exifData['GPS']['GPSAltitude'] = `${Math.round(Math.abs(alt) * 100)}/100`;
      exifData['GPS']['GPSAltitudeRef'] = alt >= 0 ? '0' : '1';
      break;
    }
  }
}

function applyExifChange(exifData: Record<string, Record<string, string>>, field: string, value: unknown) {
  if (!exifData['IFD0']) exifData['IFD0'] = {};
  if (!exifData['EXIF']) exifData['EXIF'] = {};

  const ifd0Fields: Record<string, string> = {
    make: 'Make',
    model: 'Model',
    software: 'Software',
    orientation: 'Orientation',
    imageDescription: 'ImageDescription',
    copyright: 'Copyright',
    artist: 'Artist',
  };

  const exifFields: Record<string, string> = {
    lensModel: 'LensModel',
    fNumber: 'FNumber',
    exposureTime: 'ExposureTime',
    iso: 'ISOSpeedRatings',
    focalLength: 'FocalLength',
  };

  if (ifd0Fields[field]) {
    exifData['IFD0'][ifd0Fields[field]] = String(value);
  } else if (exifFields[field]) {
    exifData['EXIF'][exifFields[field]] = String(value);
  }
}

function applyIptcChange(exifData: Record<string, Record<string, string>>, field: string, value: unknown) {
  // Map IPTC fields to IFD0 equivalents where possible
  if (!exifData['IFD0']) exifData['IFD0'] = {};

  switch (field) {
    case 'description':
      exifData['IFD0']['ImageDescription'] = String(value);
      break;
    case 'copyright':
      exifData['IFD0']['Copyright'] = String(value);
      break;
    case 'creator':
      exifData['IFD0']['Artist'] = String(value);
      break;
  }
}

function toExifDateString(value: unknown): string | null {
  if (!value) return null;
  try {
    const date = new Date(String(value));
    if (isNaN(date.getTime())) return null;
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const h = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    const s = String(date.getSeconds()).padStart(2, '0');
    return `${y}:${m}:${d} ${h}:${min}:${s}`;
  } catch {
    return null;
  }
}

function decimalToRational(decimal: number): string {
  const degrees = Math.floor(decimal);
  const minutesDecimal = (decimal - degrees) * 60;
  const minutes = Math.floor(minutesDecimal);
  const seconds = Math.round((minutesDecimal - minutes) * 60 * 100);
  return `${degrees}/1 ${minutes}/1 ${seconds}/100`;
}
