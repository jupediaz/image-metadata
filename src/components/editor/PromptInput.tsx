'use client';

import { useState, useEffect } from 'react';

interface PromptInputProps {
  value: string;
  onChange: (value: string) => void;
  onGenerate: () => void;
  isProcessing?: boolean;
  processingModel?: string;
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

export default function PromptInput({
  value,
  onChange,
  onGenerate,
  isProcessing = false,
  processingModel,
  className = '',
}: PromptInputProps) {
  const [elapsedTime, setElapsedTime] = useState(0);

  // Timer: starts fresh each time isProcessing becomes true, auto-resets to 0
  useEffect(() => {
    if (!isProcessing) {
      // Use a microtask to avoid synchronous setState-in-effect lint error
      const timeout = setTimeout(() => setElapsedTime(0), 0);
      return () => clearTimeout(timeout);
    }

    const startTime = Date.now();
    const interval = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
    }, 100);

    return () => clearInterval(interval);
  }, [isProcessing]);
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

      {/* Processing indicator with time and model */}
      {isProcessing && (
        <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 border border-blue-500/30 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="relative">
                <div className="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-white">
                  Procesando con {processingModel || 'Gemini AI'}
                </div>
                <div className="text-xs text-gray-400">
                  Tiempo transcurrido: {elapsedTime}s
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-400">Estimado</div>
              <div className="text-sm font-medium text-blue-400">30-60s</div>
            </div>
          </div>

          {/* Animated progress bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-gray-400">
              <span>Generando edición...</span>
              <span className="text-blue-400">En progreso</span>
            </div>
            <div className="h-2 bg-gray-700/50 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 animate-pulse relative">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
              </div>
            </div>
          </div>
        </div>
      )}


      {/* Suggestion chips */}
      <div className="flex flex-wrap gap-2">
        <span className="text-xs text-gray-400">Quick suggestions:</span>
        {PROMPT_SUGGESTIONS.slice(0, 4).map((suggestion) => (
          <button
            key={suggestion}
            onClick={() => onChange(suggestion)}
            className="px-2 py-1 text-xs bg-gray-700 text-gray-300 rounded hover:bg-gray-600 transition-colors"
            disabled={isProcessing}
          >
            {suggestion}
          </button>
        ))}
      </div>

      {/* Generate button */}
      <button
        onClick={onGenerate}
        disabled={!value.trim() || isProcessing}
        className={`w-full py-3 rounded-lg font-medium transition-all ${
          !value.trim() || isProcessing
            ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
            : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 hover:shadow-lg hover:shadow-blue-500/50'
        }`}
      >
        {isProcessing ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Generando ({elapsedTime}s)...
          </span>
        ) : (
          '✨ Generar Edición con IA'
        )}
      </button>
    </div>
  );
}
