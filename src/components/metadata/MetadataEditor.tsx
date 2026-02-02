'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { ImageFile, ImageMetadata } from '@/types/image';
import { MetadataChange } from '@/types/api';
import { useImageStore } from '@/hooks/useImageStore';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';

const LocationMap = dynamic(() => import('@/components/map/LocationMap'), {
  ssr: false,
  loading: () => <div className="h-48 bg-gray-100 dark:bg-gray-800 animate-pulse rounded-lg" />,
});

interface Props {
  image: ImageFile;
  onClose: () => void;
}

export function MetadataEditor({ image, onClose }: Props) {
  const { metadata } = image;
  const sessionId = useImageStore((s) => s.sessionId);
  const updateImage = useImageStore((s) => s.updateImage);
  const updateMetadata = useImageStore((s) => s.updateMetadata);
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  // Editable fields state
  const [exifFields, setExifFields] = useState({
    make: metadata?.exif?.make || '',
    model: metadata?.exif?.model || '',
    software: metadata?.exif?.software || '',
    lensModel: metadata?.exif?.lensModel || '',
  });

  const [dateFields, setDateFields] = useState({
    dateTimeOriginal: toDatetimeLocal(metadata?.dates?.dateTimeOriginal),
    dateTimeDigitized: toDatetimeLocal(metadata?.dates?.dateTimeDigitized),
    modifyDate: toDatetimeLocal(metadata?.dates?.modifyDate),
  });

  const [gpsFields, setGpsFields] = useState({
    latitude: metadata?.gps?.latitude?.toString() || '',
    longitude: metadata?.gps?.longitude?.toString() || '',
    altitude: metadata?.gps?.altitude?.toString() || '',
  });

  const [iptcFields, setIptcFields] = useState({
    description: metadata?.iptc?.description || '',
    copyright: metadata?.iptc?.copyright || '',
    creator: metadata?.iptc?.creator || '',
  });

  const handleSave = async () => {
    setSaving(true);
    const changes: MetadataChange[] = [];

    // Collect EXIF changes
    for (const [field, value] of Object.entries(exifFields)) {
      const original = metadata?.exif?.[field as keyof typeof metadata.exif];
      if (value && value !== (original || '')) {
        changes.push({ section: 'exif', field, value });
      }
    }

    // Collect date changes
    for (const [field, value] of Object.entries(dateFields)) {
      if (value) {
        const original = toDatetimeLocal(metadata?.dates?.[field as keyof typeof metadata.dates] as string);
        if (value !== original) {
          changes.push({ section: 'dates', field, value: new Date(value).toISOString() });
        }
      }
    }

    // Collect GPS changes
    for (const [field, value] of Object.entries(gpsFields)) {
      if (value) {
        const original = metadata?.gps?.[field as keyof typeof metadata.gps];
        if (value !== String(original || '')) {
          changes.push({ section: 'gps', field, value: Number(value) });
        }
      }
    }

    // Collect IPTC changes
    for (const [field, value] of Object.entries(iptcFields)) {
      const original = metadata?.iptc?.[field as keyof typeof metadata.iptc];
      if (value && value !== (original || '')) {
        changes.push({ section: 'iptc', field, value });
      }
    }

    if (changes.length === 0) {
      toast('info', 'No hay cambios para guardar');
      setSaving(false);
      return;
    }

    try {
      const res = await fetch('/api/metadata', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, imageId: image.id, changes }),
      });

      if (!res.ok) throw new Error('Error guardando');

      const data = await res.json();
      updateMetadata(image.id, data.metadata);
      updateImage(image.id, { size: data.size });
      toast('success', `${changes.length} campo${changes.length > 1 ? 's' : ''} actualizado${changes.length > 1 ? 's' : ''}`);
      onClose();
    } catch (err) {
      toast('error', 'Error al guardar los cambios');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">Editar Metadata</h3>
        <Button variant="ghost" size="sm" onClick={onClose}>Cancelar</Button>
      </div>

      {/* Camera / EXIF */}
      <FieldGroup title="Camara">
        <Field label="Fabricante" value={exifFields.make} onChange={(v) => setExifFields({ ...exifFields, make: v })} />
        <Field label="Modelo" value={exifFields.model} onChange={(v) => setExifFields({ ...exifFields, model: v })} />
        <Field label="Lente" value={exifFields.lensModel} onChange={(v) => setExifFields({ ...exifFields, lensModel: v })} />
        <Field label="Software" value={exifFields.software} onChange={(v) => setExifFields({ ...exifFields, software: v })} />
      </FieldGroup>

      {/* Dates */}
      <FieldGroup title="Fechas">
        <Field label="Fecha original" type="datetime-local" value={dateFields.dateTimeOriginal} onChange={(v) => setDateFields({ ...dateFields, dateTimeOriginal: v })} />
        <Field label="Fecha digitalizacion" type="datetime-local" value={dateFields.dateTimeDigitized} onChange={(v) => setDateFields({ ...dateFields, dateTimeDigitized: v })} />
        <Field label="Fecha modificacion" type="datetime-local" value={dateFields.modifyDate} onChange={(v) => setDateFields({ ...dateFields, modifyDate: v })} />
      </FieldGroup>

      {/* GPS */}
      <FieldGroup title="GPS">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Latitud" type="number" value={gpsFields.latitude} onChange={(v) => setGpsFields({ ...gpsFields, latitude: v })} step="0.000001" />
          <Field label="Longitud" type="number" value={gpsFields.longitude} onChange={(v) => setGpsFields({ ...gpsFields, longitude: v })} step="0.000001" />
        </div>
        <Field label="Altitud (m)" type="number" value={gpsFields.altitude} onChange={(v) => setGpsFields({ ...gpsFields, altitude: v })} />
        {gpsFields.latitude && gpsFields.longitude && (
          <div className="mt-2">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Toca el mapa para cambiar la ubicacion</p>
            <LocationMap
              latitude={Number(gpsFields.latitude) || 0}
              longitude={Number(gpsFields.longitude) || 0}
              onLocationChange={(lat, lng) => {
                setGpsFields({ ...gpsFields, latitude: lat.toFixed(6), longitude: lng.toFixed(6) });
              }}
            />
          </div>
        )}
      </FieldGroup>

      {/* IPTC */}
      <FieldGroup title="Descripcion">
        <Field label="Descripcion" value={iptcFields.description} onChange={(v) => setIptcFields({ ...iptcFields, description: v })} multiline />
        <Field label="Copyright" value={iptcFields.copyright} onChange={(v) => setIptcFields({ ...iptcFields, copyright: v })} />
        <Field label="Autor" value={iptcFields.creator} onChange={(v) => setIptcFields({ ...iptcFields, creator: v })} />
      </FieldGroup>

      {/* Save */}
      <div className="sticky bottom-0 bg-white dark:bg-gray-900 py-4 border-t border-gray-200 dark:border-gray-700">
        <Button onClick={handleSave} disabled={saving} className="w-full">
          {saving ? <><Spinner size="sm" /> Guardando...</> : 'Guardar cambios'}
        </Button>
      </div>
    </div>
  );
}

function FieldGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">{title}</h4>
      <div className="space-y-3">
        {children}
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  multiline = false,
  step,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  multiline?: boolean;
  step?: string;
}) {
  const inputClass = "w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none min-h-[44px]";

  return (
    <div>
      <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</label>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`${inputClass} min-h-[80px] resize-y`}
          rows={3}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={inputClass}
          step={step}
        />
      )}
    </div>
  );
}

function toDatetimeLocal(dateStr?: string | null): string {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';
    // Format: YYYY-MM-DDTHH:MM
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const h = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    return `${y}-${m}-${d}T${h}:${min}`;
  } catch {
    return '';
  }
}
