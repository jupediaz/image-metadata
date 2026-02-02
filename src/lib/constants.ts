export function formatToExt(format: string): string {
  const map: Record<string, string> = {
    jpeg: '.jpg',
    jpg: '.jpg',
    png: '.png',
    webp: '.webp',
    heic: '.heic',
    heif: '.heic',
    tiff: '.tiff',
  };
  return map[format.toLowerCase()] || `.${format}`;
}

export function formatExposureTime(seconds: number): string {
  if (seconds >= 1) return `${seconds}s`;
  const denominator = Math.round(1 / seconds);
  return `1/${denominator}s`;
}

export function formatFocalLength(mm: number): string {
  return `${mm}mm`;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function decimalToDMS(decimal: number): { degrees: number; minutes: number; seconds: number; direction: string } {
  const absolute = Math.abs(decimal);
  const degrees = Math.floor(absolute);
  const minutesDecimal = (absolute - degrees) * 60;
  const minutes = Math.floor(minutesDecimal);
  const seconds = (minutesDecimal - minutes) * 60;
  return { degrees, minutes, seconds: Math.round(seconds * 100) / 100, direction: decimal >= 0 ? '' : '-' };
}

export function formatCoordinate(decimal: number, type: 'lat' | 'lng'): string {
  const { degrees, minutes, seconds } = decimalToDMS(decimal);
  const dir = type === 'lat'
    ? (decimal >= 0 ? 'N' : 'S')
    : (decimal >= 0 ? 'E' : 'W');
  return `${degrees}° ${minutes}' ${seconds}" ${dir}`;
}

export function formatExifDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return dateStr;
  }
}
