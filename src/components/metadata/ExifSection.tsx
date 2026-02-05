'use client';

import { ExifData } from '@/types/image';
import { formatExposureTime, formatFocalLength } from '@/lib/constants';

interface Props {
  data: ExifData;
}

export function ExifSection({ data }: Props) {
  const rows: Array<{ label: string; value: string }> = [];

  if (data.make) rows.push({ label: 'Fabricante', value: data.make });
  if (data.model) rows.push({ label: 'Modelo', value: data.model });
  if (data.lensModel) rows.push({ label: 'Lente', value: data.lensModel });
  if (data.software) rows.push({ label: 'Software', value: data.software });
  if (data.focalLength) rows.push({ label: 'Distancia focal', value: formatFocalLength(data.focalLength) });
  if (data.focalLengthIn35mm) rows.push({ label: 'Equiv. 35mm', value: formatFocalLength(data.focalLengthIn35mm) });
  if (data.fNumber) rows.push({ label: 'Apertura', value: `f/${data.fNumber}` });
  if (data.exposureTime) rows.push({ label: 'Velocidad', value: formatExposureTime(data.exposureTime) });
  if (data.iso) rows.push({ label: 'ISO', value: String(data.iso) });
  if (data.exposureBias) rows.push({ label: 'Comp. exposicion', value: `${data.exposureBias > 0 ? '+' : ''}${data.exposureBias} EV` });
  if (data.meteringMode) rows.push({ label: 'Medicion', value: data.meteringMode });
  if (data.whiteBalance) rows.push({ label: 'Balance blancos', value: data.whiteBalance });
  if (data.flash) rows.push({ label: 'Flash', value: data.flash });
  if (data.colorSpace) rows.push({ label: 'Espacio color', value: data.colorSpace });
  if (data.orientation) rows.push({ label: 'Orientacion', value: `${data.orientation}` });

  return <MetadataTable rows={rows} />;
}

function MetadataTable({ rows }: { rows: Array<{ label: string; value: string }> }) {
  return (
    <div className="space-y-0.5">
      {rows.map(({ label, value }) => (
        <div key={label} className="flex justify-between items-start py-0.5 text-xs">
          <span className="text-gray-500 dark:text-gray-400 flex-shrink-0 mr-3">{label}</span>
          <span className="text-gray-900 dark:text-gray-100 text-right font-mono text-[10px] break-all">{value}</span>
        </div>
      ))}
    </div>
  );
}
