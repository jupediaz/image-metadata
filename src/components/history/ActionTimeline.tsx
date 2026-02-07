'use client';

import { useEditorStore } from '@/hooks/useEditorStore';
import HistoryEntry from './HistoryEntry';

export default function ActionTimeline() {
  const actionHistory = useEditorStore((s) => s.actionHistory);
  const currentActionIndex = useEditorStore((s) => s.currentActionIndex);
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);

  if (actionHistory.length === 0) {
    return (
      <div className="p-4 text-center text-xs text-[#585858]">
        No actions yet. Start editing to build history.
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {/* Undo/Redo controls */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[#3c3c3c]">
        <button
          onClick={() => undo()}
          disabled={currentActionIndex < 0}
          className="px-2 py-1 text-[10px] bg-[#2d2d2d] rounded border border-[#3c3c3c] text-[#cccccc] disabled:opacity-30 hover:bg-[#3c3c3c] transition-colors"
        >
          Undo
        </button>
        <button
          onClick={() => redo()}
          disabled={currentActionIndex >= actionHistory.length - 1}
          className="px-2 py-1 text-[10px] bg-[#2d2d2d] rounded border border-[#3c3c3c] text-[#cccccc] disabled:opacity-30 hover:bg-[#3c3c3c] transition-colors"
        >
          Redo
        </button>
        <span className="text-[10px] text-[#585858] ml-auto">
          {currentActionIndex + 1} / {actionHistory.length}
        </span>
      </div>

      {/* Timeline */}
      <div className="flex flex-col">
        {/* Original state */}
        <div
          className={`flex items-center gap-2 px-3 py-2 text-xs border-b border-[#3c3c3c] ${
            currentActionIndex < 0
              ? 'bg-[#094771] text-white'
              : 'text-[#858585] hover:bg-[#2d2d2d]'
          }`}
        >
          <div className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
          <span>Original</span>
        </div>

        {/* Actions */}
        {actionHistory.map((action, index) => (
          <HistoryEntry
            key={action.id}
            action={action}
            index={index}
            isCurrent={index === currentActionIndex}
            isFuture={index > currentActionIndex}
          />
        ))}
      </div>
    </div>
  );
}
