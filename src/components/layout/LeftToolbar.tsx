'use client';

import { type EditorTool } from './EditorShell';

interface LeftToolbarProps {
  activeTool: EditorTool;
  onToolChange: (tool: EditorTool) => void;
  brushSize: number;
  onBrushSizeChange: (size: number) => void;
}

interface ToolDef {
  id: EditorTool;
  label: string;
  shortcut: string;
  icon: React.ReactNode;
}

const tools: ToolDef[] = [
  {
    id: 'select',
    label: 'Select',
    shortcut: 'V',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" />
        <path d="M13 13l6 6" />
      </svg>
    ),
  },
  {
    id: 'pan',
    label: 'Pan',
    shortcut: 'H',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M18 11V6a2 2 0 0 0-2-2 2 2 0 0 0-2 2v-1a2 2 0 0 0-2-2 2 2 0 0 0-2 2v1a2 2 0 0 0-2-2 2 2 0 0 0-2 2v5" />
        <path d="M18 11a2 2 0 1 1 4 0v3a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.9-5.7-2.4L3.6 16.3a2 2 0 0 1 .3-2.7 2 2 0 0 1 2.7.1L8 15V6" />
      </svg>
    ),
  },
  {
    id: 'brush',
    label: 'Brush',
    shortcut: 'B',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M12 19l7-7 3 3-7 7-3-3z" />
        <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
        <path d="M2 2l7.586 7.586" />
        <circle cx="11" cy="11" r="2" />
      </svg>
    ),
  },
  {
    id: 'eraser',
    label: 'Eraser',
    shortcut: 'E',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21" />
        <path d="M22 21H7" />
        <path d="m5 11 9 9" />
      </svg>
    ),
  },
  {
    id: 'lasso',
    label: 'Lasso',
    shortcut: 'L',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="12" cy="12" r="7" />
        <circle cx="12" cy="12" r="3" />
        <line x1="12" y1="1" x2="12" y2="3" />
        <line x1="12" y1="21" x2="12" y2="23" />
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
        <line x1="1" y1="12" x2="3" y2="12" />
        <line x1="21" y1="12" x2="23" y2="12" />
      </svg>
    ),
  },
  {
    id: 'zoom',
    label: 'Zoom',
    shortcut: 'Z',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
        <line x1="11" y1="8" x2="11" y2="14" />
        <line x1="8" y1="11" x2="14" y2="11" />
      </svg>
    ),
  },
];

export default function LeftToolbar({
  activeTool,
  onToolChange,
  brushSize,
  onBrushSizeChange,
}: LeftToolbarProps) {
  return (
    <div className="flex flex-col items-center bg-[#252526] border-r border-[#3c3c3c] py-2 gap-1">
      {tools.map((tool) => (
        <button
          key={tool.id}
          onClick={() => onToolChange(tool.id)}
          title={`${tool.label} (${tool.shortcut})`}
          className={`w-10 h-10 flex items-center justify-center rounded transition-colors ${
            activeTool === tool.id
              ? 'bg-[#094771] text-white'
              : 'text-[#858585] hover:text-white hover:bg-[#2d2d2d]'
          }`}
        >
          {tool.icon}
        </button>
      ))}

      <div className="w-6 h-px bg-[#3c3c3c] my-2" />

      {/* Brush size indicator */}
      {(activeTool === 'brush' || activeTool === 'eraser') && (
        <div className="flex flex-col items-center gap-1 px-1">
          <div
            className="rounded-full bg-white/50 border border-white/30"
            style={{
              width: Math.max(4, Math.min(24, brushSize * 0.6)),
              height: Math.max(4, Math.min(24, brushSize * 0.6)),
            }}
          />
          <span className="text-[10px] text-[#858585]">{brushSize}</span>
        </div>
      )}
    </div>
  );
}
