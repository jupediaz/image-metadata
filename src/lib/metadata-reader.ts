import exifr from 'exifr';
import type { ImageMetadata, ExifData, GpsData, DateData, IptcData } from '@/types/image';

export async function readAllMetadata(buffer: Buffer): Promise<ImageMetadata> {
  // exifr.parse(buffer, true) returns a flat merged object with all tags
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

function extractExifData(flat: Record<string, unknown>): ExifData | null {
  const data: ExifData = {};

  if (flat.Make) data.make = String(flat.Make);
  if (flat.Model) data.model = String(flat.Model);
  if (flat.Software) data.software = String(flat.Software);
  if (flat.LensModel) data.lensModel = String(flat.LensModel);
  if (flat.FocalLength) data.focalLength = Number(flat.FocalLength);
  if (flat.FocalLengthIn35mmFormat) data.focalLengthIn35mm = Number(flat.FocalLengthIn35mmFormat);
  if (flat.FNumber) data.fNumber = Number(flat.FNumber);
  if (flat.ExposureTime) data.exposureTime = Number(flat.ExposureTime);
  if (flat.ISO) data.iso = Number(flat.ISO);
  if (flat.ExposureBiasValue) data.exposureBias = Number(flat.ExposureBiasValue);
  if (flat.MeteringMode) data.meteringMode = String(flat.MeteringMode);
  if (flat.WhiteBalance) data.whiteBalance = String(flat.WhiteBalance);
  if (flat.Flash) data.flash = String(flat.Flash);
  if (flat.ColorSpace) data.colorSpace = String(flat.ColorSpace);
  if (flat.Orientation) data.orientation = typeof flat.Orientation === 'number' ? flat.Orientation : undefined;
  if (flat.ExifImageWidth) data.imageWidth = Number(flat.ExifImageWidth);
  if (flat.ExifImageHeight) data.imageHeight = Number(flat.ExifImageHeight);
  if (flat.ImageDescription) data.imageDescription = String(flat.ImageDescription);
  if (flat.Copyright) data.copyright = String(flat.Copyright);
  if (flat.Artist) data.artist = String(flat.Artist);

  return Object.keys(data).length > 0 ? data : null;
}

function extractGpsData(
  flat: Record<string, unknown>,
  gpsCoords: { latitude: number; longitude: number } | null | undefined
): GpsData | null {
  // exifr.gps() returns { latitude, longitude } or undefined
  if (!gpsCoords) return null;

  const data: GpsData = {
    latitude: gpsCoords.latitude,
    longitude: gpsCoords.longitude,
  };

  if (flat.GPSAltitude !== undefined) data.altitude = Number(flat.GPSAltitude);
  if (flat.GPSAltitudeRef !== undefined) data.altitudeRef = String(flat.GPSAltitudeRef);
  if (flat.GPSSpeed !== undefined) data.speed = Number(flat.GPSSpeed);
  if (flat.GPSImgDirection !== undefined) data.direction = Number(flat.GPSImgDirection);
  if (flat.GPSDestBearing !== undefined) data.destBearing = Number(flat.GPSDestBearing);
  if (flat.GPSTimeStamp !== undefined) data.timestamp = String(flat.GPSTimeStamp);

  return data;
}

function extractDateData(flat: Record<string, unknown>): DateData | null {
  const data: DateData = {};

  const formatDate = (val: unknown): string | undefined => {
    if (!val) return undefined;
    if (val instanceof Date) return val.toISOString();
    return String(val);
  };

  data.dateTimeOriginal = formatDate(flat.DateTimeOriginal);
  data.dateTimeDigitized = formatDate(flat.DateTimeDigitized ?? flat.CreateDate);
  data.modifyDate = formatDate(flat.ModifyDate ?? flat.DateTime);
  data.offsetTimeOriginal = flat.OffsetTimeOriginal ? String(flat.OffsetTimeOriginal) : undefined;
  data.offsetTimeDigitized = flat.OffsetTimeDigitized ? String(flat.OffsetTimeDigitized) : undefined;
  data.offsetTime = flat.OffsetTime ? String(flat.OffsetTime) : undefined;

  const hasValues = Object.values(data).some((v) => v !== undefined);
  return hasValues ? data : null;
}

function extractIptcData(flat: Record<string, unknown>): IptcData | null {
  const data: IptcData = {};

  if (flat.ObjectName) data.title = String(flat.ObjectName);
  if (flat.Caption) data.description = String(flat.Caption);
  if (flat.ImageDescription) data.description = data.description ?? String(flat.ImageDescription);
  if (flat.Keywords) {
    const kw = flat.Keywords;
    data.keywords = Array.isArray(kw) ? kw.map(String) : [String(kw)];
  }
  if (flat.CopyrightNotice || flat.Copyright) data.copyright = String(flat.CopyrightNotice ?? flat.Copyright);
  if (flat.Creator || flat.Artist || flat.Byline) data.creator = String(flat.Creator ?? flat.Artist ?? flat.Byline);
  if (flat.City) data.city = String(flat.City);
  if (flat.Country) data.country = String(flat.Country);

  return Object.keys(data).length > 0 ? data : null;
}
