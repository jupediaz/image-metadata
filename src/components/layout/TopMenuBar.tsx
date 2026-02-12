'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { type EditorTool } from './EditorShell';

interface TopMenuBarProps {
  filename: string;
  onBack: () => void;
  imageId: string;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onExport?: () => void;
  activeTool: EditorTool;
  onToolChange: (tool: EditorTool) => void;
  brushSize: number;
}

interface MenuItem {
  label: string;
  shortcut?: string;
  action?: () => void;
  separator?: boolean;
  disabled?: boolean;
}

export default function TopMenuBar({
  filename,
  onBack,
  imageId,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onExport,
  activeTool,
  onToolChange,
  brushSize,
}: TopMenuBarProps) {
  const router = useRouter();
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const menus: Record<string, MenuItem[]> = {
    File: [
      { label: 'Back to Detail', shortcut: 'Esc', action: onBack },
      { label: 'Back to Gallery', action: () => router.push('/') },
      { label: '', separator: true },
      { label: 'Export Image', shortcut: 'Ctrl+E', action: onExport },
    ],
    Edit: [
      { label: 'Undo', shortcut: 'Ctrl+Z', action: onUndo, disabled: !canUndo },
      { label: 'Redo', shortcut: 'Ctrl+Shift+Z', action: onRedo, disabled: !canRedo },
      { label: '', separator: true },
      { label: 'Clear Mask', action: () => {} },
    ],
    View: [
      { label: 'Zoom In', shortcut: 'Ctrl++', disabled: true },
      { label: 'Zoom Out', shortcut: 'Ctrl+-', disabled: true },
      { label: 'Fit to Screen', shortcut: 'Ctrl+0', disabled: true },
      { label: '', separator: true },
      { label: 'Compare Mode', action: () => router.push(`/image/${imageId}/compare`) },
    ],
    AI: [
      { label: 'Generate Edit', shortcut: 'Ctrl+Enter', disabled: true },
      { label: '', separator: true },
      { label: 'Compare Models', action: () => router.push(`/image/${imageId}/compare`) },
    ],
  };

  return (
    <div className="flex items-center bg-[#252526] border-b border-[#3c3c3c] text-xs">
      {/* Back button - saves automatically */}
      <button
        onClick={onBack}
        title="Back — your work is saved automatically"
        className="group relative flex items-center gap-1.5 px-3 h-full text-[#858585] hover:text-white hover:bg-[#2d2d2d] transition-colors"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        <span className="text-[11px] hidden group-hover:inline">Save & Back</span>
      </button>

      {/* Menu items */}
      <div className="flex items-center h-full relative">
        {Object.entries(menus).map(([name, items]) => (
          <MenuDropdown
            key={name}
            name={name}
            items={items}
            isOpen={openMenu === name}
            onOpen={() => setOpenMenu(openMenu === name ? null : name)}
            onClose={() => setOpenMenu(null)}
            onHover={() => openMenu && setOpenMenu(name)}
          />
        ))}
      </div>

      {/* Divider */}
      <div className="w-px h-4 bg-[#3c3c3c] mx-1" />

      {/* Undo / Redo buttons */}
      <button
        onClick={onUndo}
        disabled={!canUndo}
        title="Undo (Ctrl+Z)"
        className="flex items-center justify-center w-7 h-7 rounded text-[#cccccc] hover:bg-[#2d2d2d] disabled:text-[#585858] disabled:hover:bg-transparent transition-colors"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="1 4 1 10 7 10" />
          <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
        </svg>
      </button>
      <button
        onClick={onRedo}
        disabled={!canRedo}
        title="Redo (Ctrl+Shift+Z)"
        className="flex items-center justify-center w-7 h-7 rounded text-[#cccccc] hover:bg-[#2d2d2d] disabled:text-[#585858] disabled:hover:bg-transparent transition-colors"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="23 4 23 10 17 10" />
          <path d="M20.49 15a9 9 0 1 1-2.13-9.36L23 10" />
        </svg>
      </button>

      {/* Divider */}
      <div className="w-px h-4 bg-[#3c3c3c] mx-2" />

      {/* Editing Mode Buttons - CENTER */}
      <div className="flex-1 flex items-center justify-center gap-3">
        <button
          onClick={() => onToolChange('brush')}
          className={`flex items-center gap-2 px-4 py-1.5 rounded-lg font-medium transition-all ${
            activeTool === 'brush'
              ? 'bg-green-600 text-white shadow-lg shadow-green-500/30'
              : 'bg-green-600/20 text-green-400 hover:bg-green-600/30 border border-green-600/40'
          }`}
          title="Brush (B) - Pintar zona a modificar"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 19l7-7 3 3-7 7-3-3z" />
            <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
            <path d="M2 2l7.586 7.586" />
            <circle cx="11" cy="11" r="2" />
          </svg>
          <span>Zona a Modificar</span>
          {activeTool === 'brush' && brushSize && (
            <span className="text-xs bg-green-700 px-1.5 py-0.5 rounded">
              {brushSize}px
            </span>
          )}
        </button>

        <button
          onClick={() => onToolChange('protect')}
          className={`flex items-center gap-2 px-4 py-1.5 rounded-lg font-medium transition-all ${
            activeTool === 'protect'
              ? 'bg-red-600 text-white shadow-lg shadow-red-500/30'
              : 'bg-red-600/20 text-red-400 hover:bg-red-600/30 border border-red-600/40'
          }`}
          title="Protect (P) - Pintar zona protegida"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <path d="M12 8v4" />
            <path d="M12 16h.01" />
          </svg>
          <span>Zona Protegida</span>
          {activeTool === 'protect' && brushSize && (
            <span className="text-xs bg-red-700 px-1.5 py-0.5 rounded">
              {brushSize}px
            </span>
          )}
        </button>
      </div>

      {/* Filename - Right side */}
      <div className="text-[#858585] text-xs px-4 truncate max-w-xs">
        {filename}
      </div>

      {/* Spacer for right side */}
      <div className="w-12" />
    </div>
  );
}

function MenuDropdown({
  name,
  items,
  isOpen,
  onOpen,
  onClose,
  onHover,
}: {
  name: string;
  items: MenuItem[];
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
  onHover: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen, onClose]);

  return (
    <div ref={ref} className="relative h-full">
      <button
        onClick={onOpen}
        onMouseEnter={onHover}
        className={`px-3 h-full transition-colors ${
          isOpen ? 'bg-[#094771] text-white' : 'text-[#cccccc] hover:bg-[#2d2d2d]'
        }`}
      >
        {name}
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 z-50 min-w-[220px] bg-[#252526] border border-[#454545] rounded-sm shadow-xl py-1">
          {items.map((item, i) =>
            item.separator ? (
              <div key={i} className="h-px bg-[#454545] my-1 mx-2" />
            ) : (
              <button
                key={item.label}
                onClick={() => {
                  if (!item.disabled && item.action) {
                    item.action();
                    onClose();
                  }
                }}
                disabled={item.disabled}
                className={`w-full flex items-center justify-between px-6 py-1.5 text-left ${
                  item.disabled
                    ? 'text-[#585858] cursor-default'
                    : 'text-[#cccccc] hover:bg-[#094771]'
                }`}
              >
                <span>{item.label}</span>
                {item.shortcut && (
                  <span className="text-[#585858] ml-8">{item.shortcut}</span>
                )}
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
}
