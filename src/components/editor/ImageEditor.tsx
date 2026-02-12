'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useImageStore } from '@/hooks/useImageStore';
import { useProgress } from '@/hooks/useProgress';
import { persistEditVersion } from '@/lib/persistence';
import InpaintingCanvas from './InpaintingCanvas';
import PromptInput from './PromptInput';
import { GeminiEditApiRequest, GeminiEditApiResponse } from '@/types/api';
import { EditVersion } from '@/types/image';

interface ImageEditorProps {
  imageId: string;
}

export default function ImageEditor({ imageId }: ImageEditorProps) {
  const router = useRouter();
  const {
    editorState,
    sessionId,
    images,
    cancelAiEdit,
    setEditorMask,
    setEditorPrompt,
    setEditorProcessing,
    setEditorPreview,
    setEditorError,
    saveEditVersion,
  } = useImageStore();

  const { startProgress, updateProgress, finishProgress, failProgress } = useProgress();
  const [preserveExif, setPreserveExif] = useState(true);
  // CRITICAL: Default model MUST be Pro Image
  const [selectedModel, setSelectedModel] = useState('gemini-3-pro-image-preview');
  const [safeZoneMask, setSafeZoneMask] = useState<string | null>(null);

  const modelOptions = [
    {
      value: 'gemini-3-pro-image-preview',
      label: 'Pro Image',
      nickname: 'Nano Banana Pro',
      description: 'Highest quality (slower)',
    },
    {
      value: 'gemini-2.5-flash-image',
      label: 'Flash Image',
      nickname: 'Nano Banana',
      description: 'Fast generation (recommended)',
    },
  ];

  if (!editorState) {
    return null;
  }

  const currentImage = images.find((img) => img.id === imageId);
  if (!currentImage) {
    return <div className="text-white">Image not found</div>;
  }

  const imageUrl = `/api/image?sessionId=${sessionId}&id=${currentImage.id}`;

  const handleBack = () => {
    cancelAiEdit();
    router.push(`/image/${imageId}`);
  };

  const handleGenerate = async () => {
    if (!editorState.prompt.trim()) return;

    setEditorProcessing(true);
    setEditorError(null);
    setEditorPreview(null);

    const progressId = startProgress('ai-edit', 'Generando edición con IA...');

    try {
      updateProgress(progressId, 10, 'Preparando solicitud...');

      const request: GeminiEditApiRequest = {
        sessionId,
        imageId: currentImage.id,
        prompt: editorState.prompt,
        maskDataUrl: editorState.maskDataUrl || undefined,
        safeZoneMaskDataUrl: safeZoneMask || undefined,
        preserveExif,
        model: selectedModel,
      };

      const userApiKey = typeof window !== 'undefined'
        ? localStorage.getItem('gemini_api_key')
        : null;

      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      if (userApiKey) {
        headers['x-gemini-api-key'] = userApiKey;
      }

      updateProgress(progressId, 20, 'Enviando a Gemini AI...');

      const response = await fetch('/api/gemini/edit', {
        method: 'POST',
        headers,
        body: JSON.stringify(request),
      });

      updateProgress(progressId, 80, 'Procesando resultado...');

      const data: GeminiEditApiResponse = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate edit');
      }

      updateProgress(progressId, 90, 'Guardando versión...');

      const version: EditVersion = {
        id: data.newVersionId,
        timestamp: new Date(),
        prompt: editorState.prompt,
        maskDataUrl: editorState.maskDataUrl || undefined,
        imageUrl: data.editedImageUrl,
        thumbnailUrl: data.thumbnailUrl,
        model: selectedModel,
        processingTimeMs: data.processingTimeMs,
        originalExifDump: data.exifDump,
      };

      // Save to Zustand store
      saveEditVersion(currentImage.id, version);

      // Persist to IndexedDB
      try {
        updateProgress(progressId, 95, 'Persistiendo en IndexedDB...');

        const [versionBlob, thumbnailBlob] = await Promise.all([
          fetch(data.editedImageUrl).then((r) => r.blob()),
          data.thumbnailUrl ? fetch(data.thumbnailUrl).then((r) => r.blob()) : Promise.resolve(undefined),
        ]);

        await persistEditVersion(currentImage.id, version, versionBlob, thumbnailBlob);
        console.log(`✅ Persisted edit version: ${version.id}`);
      } catch (persistError) {
        console.error('Failed to persist edit version:', persistError);
        // Don't fail the whole operation if persistence fails
      }

      setEditorPreview(data.editedImageUrl);

      finishProgress(progressId);

      // Redirect to comparison view with fromEditor flag
      router.push(`/image/${imageId}/compare?left=original&right=model-${selectedModel}&fromEditor=true`);
    } catch (error) {
      console.error('Error generating edit:', error);
      const errorMsg = error instanceof Error ? error.message : 'Failed to generate edit';
      setEditorError(errorMsg);
      failProgress(progressId, errorMsg);
    } finally {
      setEditorProcessing(false);
    }
  };


  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={handleBack}
                className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back
              </button>
              <div>
                <h1 className="text-xl font-semibold">AI Image Editor</h1>
                <p className="text-sm text-gray-400">{currentImage.filename}</p>
              </div>
            </div>

            {editorState.error && (
              <div className="px-4 py-2 bg-red-900/50 border border-red-700 rounded-lg text-sm">
                {editorState.error}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
            {/* Left: Canvas */}
            <div className="lg:col-span-2">
              <InpaintingCanvas
                imageUrl={imageUrl}
                onMaskChange={(maskDataUrl) => setEditorMask(maskDataUrl)}
                onSafeZoneMaskChange={(maskDataUrl) => setSafeZoneMask(maskDataUrl)}
              />
            </div>

            {/* Right: Controls */}
            <div className="space-y-6">
              <PromptInput
                value={editorState.prompt}
                onChange={(prompt) => setEditorPrompt(prompt)}
                onGenerate={handleGenerate}
                isProcessing={editorState.isProcessing}
                processingModel={modelOptions.find(m => m.value === selectedModel)?.nickname}
              />

              {/* Model Selector */}
              <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
                <label className="block mb-3">
                  <div className="font-medium text-gray-200 mb-1">AI Model</div>
                  <div className="text-xs text-gray-400 mb-3">
                    Choose the model for image editing
                  </div>
                </label>
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  disabled={editorState.isProcessing}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
                >
                  {modelOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label} ({option.nickname})
                    </option>
                  ))}
                </select>
                <div className="mt-2 text-xs text-gray-400">
                  {modelOptions.find((m) => m.value === selectedModel)?.description}
                </div>
              </div>

              {/* EXIF Preservation Toggle */}
              <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preserveExif}
                    onChange={(e) => setPreserveExif(e.target.checked)}
                    disabled={editorState.isProcessing}
                    className="w-5 h-5 rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0"
                  />
                  <div>
                    <div className="font-medium text-gray-200">Preserve Metadata</div>
                    <div className="text-xs text-gray-400">
                      Keep original EXIF, GPS, and camera information
                    </div>
                  </div>
                </label>
              </div>

              {/* Info */}
              <div className="p-4 bg-gray-800 rounded-lg border border-gray-700 text-sm text-gray-400">
                <p className="mb-2">
                  <strong className="text-gray-300">How it works:</strong>
                </p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Draw a mask over areas to edit (optional)</li>
                  <li>Describe your desired changes</li>
                  <li>Click &quot;Generate AI Edit&quot;</li>
                  <li>Review and accept or refine</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
