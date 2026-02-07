'use client';

import { EditAction } from '@/hooks/useEditorStore';

interface HistoryEntryProps {
  action: EditAction;
  index: number;
  isCurrent: boolean;
  isFuture: boolean;
}

const typeLabels: Record<EditAction['type'], string> = {
  'ai-edit': 'AI Edit',
  'mask-draw': 'Mask Draw',
  'revert': 'Revert',
};

export default function HistoryEntry({
  action,
  index,
  isCurrent,
  isFuture,
}: HistoryEntryProps) {
  const time = new Date(action.timestamp);
  const timeStr = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div
      className={`flex items-center gap-2 px-3 py-2 text-xs border-b border-[#3c3c3c] transition-colors ${
        isCurrent
          ? 'bg-[#094771] text-white'
          : isFuture
          ? 'text-[#454545] opacity-50'
          : 'text-[#cccccc] hover:bg-[#2d2d2d]'
      }`}
    >
      {/* Thumbnail */}
      {action.thumbnailUrl ? (
        <img
          src={action.thumbnailUrl}
          alt=""
          className="w-8 h-8 object-cover rounded border border-[#3c3c3c] shrink-0"
        />
      ) : (
        <div className="w-8 h-8 rounded border border-[#3c3c3c] bg-[#2d2d2d] shrink-0 flex items-center justify-center">
          <span className="text-[10px]">{index + 1}</span>
        </div>
      )}

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          <span className="font-medium">{typeLabels[action.type]}</span>
          {action.model && (
            <span className="text-[10px] text-[#585858]">
              ({action.model.includes('flash') ? 'Flash' : 'Pro'})
            </span>
          )}
        </div>
        {action.prompt && (
          <p className="text-[10px] text-[#858585] truncate">{action.prompt}</p>
        )}
      </div>

      {/* Time */}
      <span className="text-[10px] text-[#585858] shrink-0">{timeStr}</span>
    </div>
  );
}
