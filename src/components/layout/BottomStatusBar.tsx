'use client';

interface BottomStatusBarProps {
  zoom: number;
  onZoomChange: (zoom: number) => void;
  imageWidth: number;
  imageHeight: number;
  cursorPos: { x: number; y: number } | null;
}

export default function BottomStatusBar({
  zoom,
  onZoomChange,
  imageWidth,
  imageHeight,
  cursorPos,
}: BottomStatusBarProps) {
  const zoomPercent = Math.round(zoom * 100);

  return (
    <div className="flex items-center justify-between bg-[#007acc] text-white text-[11px] px-3">
      {/* Left: cursor position */}
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

      {/* Right: zoom controls */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => onZoomChange(Math.max(0.1, zoom - 0.25))}
          className="hover:bg-white/20 px-1 rounded"
        >
          -
        </button>
        <input
          type="range"
          min="10"
          max="500"
          value={zoomPercent}
          onChange={(e) => onZoomChange(Number(e.target.value) / 100)}
          className="w-20 h-1 accent-white"
        />
        <button
          onClick={() => onZoomChange(Math.min(5, zoom + 0.25))}
          className="hover:bg-white/20 px-1 rounded"
        >
          +
        </button>
        <button
          onClick={() => onZoomChange(1)}
          className="hover:bg-white/20 px-1.5 rounded"
        >
          {zoomPercent}%
        </button>
      </div>
    </div>
  );
}
