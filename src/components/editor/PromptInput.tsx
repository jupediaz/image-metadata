'use client';

import { useState, useEffect, useRef } from 'react';

interface PromptInputProps {
  value: string;
  onChange: (value: string) => void;
  onGenerate: () => void;
  onCancel?: () => void;
  isProcessing?: boolean;
  processingModel?: string;
  estimatedSeconds?: number;
  className?: string;
}

const PROMPT_SUGGESTIONS = [
  'Remove the background',
  'Remove this object',
  'Change the color to blue',
  'Make it brighter',
  'Add more detail',
  'Remove text/watermark',
  'Enhance quality',
  'Make it look professional',
];

/**
 * Simulates progress using a logarithmic curve.
 * Starts fast, slows down, never reaches 100% until explicitly finished.
 * Returns 0-95 based on elapsed/estimated ratio.
 */
function simulateProgress(elapsedMs: number, estimatedMs: number): number {
  const ratio = elapsedMs / estimatedMs;
  // Logarithmic curve: fast start, slow finish
  // At ratio=1.0 (estimated time), progress is ~80%
  // Beyond that, crawls toward 95% but never reaches it
  if (ratio <= 0) return 0;
  if (ratio <= 1) {
    // 0 to 80% during estimated time
    return Math.min(80, ratio * 80 * (1 - Math.exp(-3 * ratio)));
  }
  // Beyond estimated time: slowly crawl from 80% toward 95%
  const overtime = ratio - 1;
  return Math.min(95, 80 + 15 * (1 - Math.exp(-overtime)));
}

export default function PromptInput({
  value,
  onChange,
  onGenerate,
  onCancel,
  isProcessing = false,
  processingModel,
  estimatedSeconds = 20,
  className = '',
}: PromptInputProps) {
  const [elapsedMs, setElapsedMs] = useState(0);
  const startTimeRef = useRef<number>(0);

  // Timer for elapsed time
  useEffect(() => {
    if (!isProcessing) {
      const t = setTimeout(() => setElapsedMs(0), 0);
      return () => clearTimeout(t);
    }

    startTimeRef.current = Date.now();
    const interval = setInterval(() => {
      setElapsedMs(Date.now() - startTimeRef.current);
    }, 100);

    return () => clearInterval(interval);
  }, [isProcessing]);

  const elapsedSec = Math.floor(elapsedMs / 1000);
  const estimatedMs = estimatedSeconds * 1000;
  const progress = isProcessing ? simulateProgress(elapsedMs, estimatedMs) : 0;
  const remainingSec = Math.max(0, estimatedSeconds - elapsedSec);

  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Indicaciones para la IA
        </label>
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Describe los cambios que quieres hacer en la imagen..."
          className="w-full h-40 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
          disabled={isProcessing}
        />
      </div>

      {/* Processing state: progress bar + cancel button */}
      {isProcessing && (
        <div className="bg-gray-800 border border-gray-600 rounded-lg p-4 space-y-3">
          {/* Header: model + elapsed time */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse" />
              <span className="text-sm font-medium text-white">
                {processingModel || 'Gemini AI'}
              </span>
            </div>
            <span className="text-sm tabular-nums text-gray-400">
              {elapsedSec}s / ~{estimatedSeconds}s
            </span>
          </div>

          {/* Progress bar */}
          <div className="relative">
            <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="mt-1 flex justify-between text-xs text-gray-500">
              <span>
                {progress < 15 ? 'Preparando...' :
                 progress < 50 ? 'Enviando a Gemini...' :
                 progress < 80 ? 'Generando imagen...' :
                 'Procesando resultado...'}
              </span>
              <span>{Math.round(progress)}%</span>
            </div>
          </div>

          {/* Estimated remaining */}
          {elapsedSec < estimatedSeconds && (
            <p className="text-xs text-gray-500 text-center">
              Tiempo restante estimado: ~{remainingSec}s
            </p>
          )}
          {elapsedSec >= estimatedSeconds && (
            <p className="text-xs text-yellow-500 text-center">
              Tardando mas de lo esperado...
            </p>
          )}

          {/* Cancel button */}
          <button
            onClick={onCancel}
            className="w-full py-2.5 bg-red-900/40 hover:bg-red-900/60 border border-red-700/50 hover:border-red-600 text-red-300 hover:text-red-200 rounded-lg font-medium transition-all text-sm"
          >
            Cancelar edicion
          </button>
        </div>
      )}

      {/* Suggestion chips - only show when not processing */}
      {!isProcessing && (
        <div className="flex flex-wrap gap-2">
          <span className="text-xs text-gray-400">Sugerencias:</span>
          {PROMPT_SUGGESTIONS.slice(0, 4).map((suggestion) => (
            <button
              key={suggestion}
              onClick={() => onChange(suggestion)}
              className="px-2 py-1 text-xs bg-gray-700 text-gray-300 rounded hover:bg-gray-600 transition-colors"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}

      {/* Generate button — only when not processing */}
      {!isProcessing && (
        <button
          onClick={onGenerate}
          disabled={!value.trim()}
          className={`w-full py-3 rounded-lg font-medium transition-all ${
            !value.trim()
              ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
              : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 hover:shadow-lg hover:shadow-blue-500/25'
          }`}
        >
          Generar Edicion con IA
        </button>
      )}
    </div>
  );
}
