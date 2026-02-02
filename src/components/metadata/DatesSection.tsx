'use client';

import { DateData } from '@/types/image';
import { formatExifDate } from '@/lib/constants';

interface Props {
  data: DateData;
}

export function DatesSection({ data }: Props) {
  const rows: Array<{ label: string; value: string }> = [];

  if (data.dateTimeOriginal) rows.push({ label: 'Fecha original', value: formatExifDate(data.dateTimeOriginal) });
  if (data.dateTimeDigitized) rows.push({ label: 'Fecha digitalizacion', value: formatExifDate(data.dateTimeDigitized) });
  if (data.modifyDate) rows.push({ label: 'Fecha modificacion', value: formatExifDate(data.modifyDate) });
  if (data.offsetTimeOriginal) rows.push({ label: 'Zona horaria original', value: data.offsetTimeOriginal });
  if (data.offsetTimeDigitized) rows.push({ label: 'Zona horaria digitalizacion', value: data.offsetTimeDigitized });
  if (data.offsetTime) rows.push({ label: 'Zona horaria', value: data.offsetTime });

  return (
    <div className="space-y-1">
      {rows.map(({ label, value }) => (
        <div key={label} className="flex justify-between items-start py-1.5 text-sm">
          <span className="text-gray-500 dark:text-gray-400 flex-shrink-0 mr-4">{label}</span>
          <span className="text-gray-900 dark:text-gray-100 text-right font-mono text-xs">{value}</span>
        </div>
      ))}
    </div>
  );
}
