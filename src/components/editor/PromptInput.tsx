'use client';

interface PromptInputProps {
  value: string;
  onChange: (value: string) => void;
  onGenerate: () => void;
  isProcessing?: boolean;
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
  className = '',
}: PromptInputProps) {
  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          AI Edit Instructions
        </label>
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Describe how you want to edit this image..."
          className="w-full h-24 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          disabled={isProcessing}
        />
      </div>

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
        className={`w-full py-3 rounded-lg font-medium transition-colors ${
          !value.trim() || isProcessing
            ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
            : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700'
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
            Generating...
          </span>
        ) : (
          'Generate AI Edit'
        )}
      </button>
    </div>
  );
}
