'use client';

import { useState } from 'react';

interface BottomStatusBarProps {
  zoom: number;
  onZoomChange: (zoom: number) => void;
  imageWidth: number;
  imageHeight: number;
  cursorPos: { x: number; y: number } | null;
  onFitAll?: () => void;
  onFitWidth?: () => void;
  onFitHeight?: () => void;
}

export default function BottomStatusBar({
  zoom,
  onZoomChange,
  imageWidth,
  imageHeight,
  cursorPos,
  onFitAll,
  onFitWidth,
  onFitHeight,
}: BottomStatusBarProps) {
  const zoomPercent = Math.round(zoom * 100);
  const [inputValue, setInputValue] = useState(zoomPercent.toString());

  const handleZoomInput = (value: string) => {
    setInputValue(value);
    const num = parseInt(value, 10);
    if (!isNaN(num) && num >= 10 && num <= 500) {
      onZoomChange(num / 100);
    }
  };

  return (
    <div className="flex items-center justify-between bg-[#007acc] text-white text-[11px] px-3">
      {/* Left: cursor position + dimensions */}
      <div className="flex items-center gap-4">
        {cursorPos && (
          <span>
            X: {Math.round(cursorPos.x)} Y: {Math.round(cursorPos.y)}
          </span>
        )}
        <span>
          {imageWidth} x {imageHeight}
        </span>
      </div>

      {/* Center: fit controls */}
      <div className="flex items-center gap-2">
        <button
          onClick={onFitAll}
          title="Ajustar imagen completa (Ctrl+0)"
          className="flex items-center gap-1 hover:bg-white/20 px-2 py-1 rounded transition-colors font-medium"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="M9 3v18M15 3v18M3 9h18M3 15h18" />
          </svg>
          Fit All
        </button>
        <div className="w-px h-4 bg-white/30" />
        <button
          onClick={onFitWidth}
          title="Ajustar al ancho"
          className="flex items-center gap-1 hover:bg-white/20 px-2 py-1 rounded transition-colors font-medium"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 12h16M8 8l-4 4 4 4M16 8l4 4-4 4" />
          </svg>
          Width
        </button>
        <button
          onClick={onFitHeight}
          title="Ajustar a la altura"
          className="flex items-center gap-1 hover:bg-white/20 px-2 py-1 rounded transition-colors font-medium"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 4v16M8 8l4-4 4 4M8 16l4 4 4-4" />
          </svg>
          Height
        </button>
      </div>

      {/* Right: zoom controls */}
      <div className="flex items-center gap-2">
        <span className="text-white/70 font-medium">Zoom:</span>
        <button
          onClick={() => onZoomChange(Math.max(0.1, zoom - 0.25))}
          title="Alejar (Ctrl+-)"
          className="flex items-center justify-center w-6 h-6 hover:bg-white/20 rounded transition-colors"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
        <input
          type="range"
          min="10"
          max="500"
          value={zoomPercent}
          onChange={(e) => {
            const val = Number(e.target.value);
            setInputValue(val.toString());
            onZoomChange(val / 100);
          }}
          className="w-24 h-1 accent-white cursor-pointer"
          title={`${zoomPercent}%`}
        />
        <button
          onClick={() => onZoomChange(Math.min(5, zoom + 0.25))}
          title="Acercar (Ctrl++)"
          className="flex items-center justify-center w-6 h-6 hover:bg-white/20 rounded transition-colors"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
        <div className="flex items-center gap-1">
          <input
            type="number"
            min="10"
            max="500"
            value={inputValue}
            onChange={(e) => handleZoomInput(e.target.value)}
            onBlur={() => setInputValue(zoomPercent.toString())}
            className="w-14 px-1.5 py-0.5 bg-white/20 rounded text-white text-center font-mono outline-none focus:bg-white/30"
          />
          <span className="font-mono">%</span>
        </div>
        <button
          onClick={() => onZoomChange(1)}
          title="Zoom 100%"
          className="hover:bg-white/30 px-2 py-1 rounded transition-colors font-medium"
        >
          100%
        </button>
      </div>
    </div>
  );
}
