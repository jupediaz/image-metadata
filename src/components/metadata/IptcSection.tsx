'use client';

import { IptcData } from '@/types/image';

interface Props {
  data: IptcData;
}

export function IptcSection({ data }: Props) {
  const rows: Array<{ label: string; value: string }> = [];

  if (data.title) rows.push({ label: 'Titulo', value: data.title });
  if (data.description) rows.push({ label: 'Descripcion', value: data.description });
  if (data.keywords?.length) rows.push({ label: 'Palabras clave', value: data.keywords.join(', ') });
  if (data.copyright) rows.push({ label: 'Copyright', value: data.copyright });
  if (data.creator) rows.push({ label: 'Autor', value: data.creator });
  if (data.city) rows.push({ label: 'Ciudad', value: data.city });
  if (data.country) rows.push({ label: 'Pais', value: data.country });

  return (
    <div className="space-y-1">
      {rows.map(({ label, value }) => (
        <div key={label} className="flex justify-between items-start py-1.5 text-sm">
          <span className="text-gray-500 dark:text-gray-400 flex-shrink-0 mr-4">{label}</span>
          <span className="text-gray-900 dark:text-gray-100 text-right text-xs break-all">{value}</span>
        </div>
      ))}
    </div>
  );
}
