'use client';

import { ImageFile } from '@/types/image';
import { Accordion } from '@/components/ui/Accordion';
import { ExifSection } from './ExifSection';
import { DatesSection } from './DatesSection';
import { GpsSection } from './GpsSection';
import { IptcSection } from './IptcSection';
import { RawDataSection } from './RawDataSection';

interface MetadataPanelProps {
  image: ImageFile;
}

export function MetadataPanel({ image }: MetadataPanelProps) {
  const { metadata } = image;

  if (!metadata) {
    return (
      <div className="p-6 text-center text-gray-500 dark:text-gray-400">
        <p className="text-sm">No se encontro metadata en esta imagen</p>
      </div>
    );
  }

  return (
    <div className="divide-y-0">
      {metadata.exif && (
        <Accordion title="Camara y Lente" defaultOpen badge={countFields(metadata.exif)}>
          <ExifSection data={metadata.exif} />
        </Accordion>
      )}

      {metadata.dates && (
        <Accordion title="Fechas" defaultOpen badge={countFields(metadata.dates)}>
          <DatesSection data={metadata.dates} />
        </Accordion>
      )}

      {metadata.gps && (
        <Accordion title="GPS y Ubicacion" badge="Mapa">
          <GpsSection data={metadata.gps} />
        </Accordion>
      )}

      {metadata.iptc && (
        <Accordion title="IPTC / Descripcion" badge={countFields(metadata.iptc)}>
          <IptcSection data={metadata.iptc} />
        </Accordion>
      )}

      <Accordion title="Todos los datos" badge="Raw">
        <RawDataSection data={metadata.raw} />
      </Accordion>
    </div>
  );
}

function countFields(obj: Record<string, unknown>): string {
  const count = Object.values(obj).filter((v) => v !== undefined && v !== null).length;
  return `${count}`;
}
