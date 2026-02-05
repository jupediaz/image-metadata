'use client';

import dynamic from 'next/dynamic';
import { GpsData } from '@/types/image';
import { formatCoordinate } from '@/lib/constants';

const LocationMap = dynamic(() => import('@/components/map/LocationMap'), {
  ssr: false,
  loading: () => <div className="h-48 bg-gray-100 dark:bg-gray-800 animate-pulse rounded-lg" />,
});

interface Props {
  data: GpsData;
}

export function GpsSection({ data }: Props) {
  const rows: Array<{ label: string; value: string }> = [];

  rows.push({ label: 'Latitud', value: formatCoordinate(data.latitude, 'lat') });
  rows.push({ label: 'Longitud', value: formatCoordinate(data.longitude, 'lng') });
  rows.push({ label: 'Decimal', value: `${data.latitude.toFixed(6)}, ${data.longitude.toFixed(6)}` });

  if (data.altitude !== undefined) rows.push({ label: 'Altitud', value: `${data.altitude.toFixed(1)}m` });
  if (data.speed !== undefined) rows.push({ label: 'Velocidad', value: `${data.speed.toFixed(1)} km/h` });
  if (data.direction !== undefined) rows.push({ label: 'Direccion', value: `${data.direction.toFixed(1)}°` });

  return (
    <div className="space-y-2">
      <LocationMap latitude={data.latitude} longitude={data.longitude} />

      <div className="space-y-0.5">
        {rows.map(({ label, value }) => (
          <div key={label} className="flex justify-between items-start py-0.5 text-xs">
            <span className="text-gray-500 dark:text-gray-400 flex-shrink-0 mr-3">{label}</span>
            <span className="text-gray-900 dark:text-gray-100 text-right font-mono text-[10px]">{value}</span>
          </div>
        ))}
      </div>

      <a
        href={`https://www.google.com/maps?q=${data.latitude},${data.longitude}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
          <polyline points="15 3 21 3 21 9" />
          <line x1="10" y1="14" x2="21" y2="3" />
        </svg>
        Abrir en Google Maps
      </a>
    </div>
  );
}
