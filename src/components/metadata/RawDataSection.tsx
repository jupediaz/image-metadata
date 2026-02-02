'use client';

interface Props {
  data: Record<string, unknown>;
}

export function RawDataSection({ data }: Props) {
  const sections = Object.entries(data);

  if (sections.length === 0) {
    return <p className="text-sm text-gray-500 dark:text-gray-400">Sin datos raw disponibles</p>;
  }

  return (
    <div className="space-y-4">
      {sections.map(([sectionName, sectionData]) => (
        <div key={sectionName}>
          <h4 className="text-xs font-semibold uppercase text-gray-400 dark:text-gray-500 mb-2 tracking-wider">
            {sectionName}
          </h4>
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 text-xs font-mono overflow-x-auto max-h-60 overflow-y-auto">
            {typeof sectionData === 'object' && sectionData !== null ? (
              <table className="w-full">
                <tbody>
                  {Object.entries(sectionData as Record<string, unknown>).map(([key, value]) => (
                    <tr key={key} className="border-b border-gray-200/50 dark:border-gray-700/50 last:border-0">
                      <td className="py-1 pr-3 text-gray-500 dark:text-gray-400 whitespace-nowrap align-top">
                        {key}
                      </td>
                      <td className="py-1 text-gray-900 dark:text-gray-100 break-all">
                        {formatValue(value)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <span>{String(sectionData)}</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '-';
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object') {
    if (ArrayBuffer.isView(value)) return `[Buffer: ${(value as Uint8Array).length} bytes]`;
    try { return JSON.stringify(value); } catch { return '[Object]'; }
  }
  return String(value);
}
