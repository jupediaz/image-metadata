'use client';

import { useState, useCallback, useRef } from 'react';
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
    setEditorInpaintMask,
    setEditorPrompt,
    setEditorProcessing,
    setEditorPreview,
    setEditorError,
    saveEditVersion,
  } = useImageStore();

  const { startProgress, updateProgress, finishProgress, failProgress } = useProgress();
  const [preserveExif, setPreserveExif] = useState(true);
  const [selectedModel, setSelectedModel] = useState('gemini-2.5-flash-image');
  const [safeZoneMask, setSafeZoneMask] = useState<string | null>(null);

  // AbortController for cancelling the API request
  const abortControllerRef = useRef<AbortController | null>(null);

  // Memoize callbacks to prevent InpaintingCanvas re-renders
  const handleMaskChange = useCallback((maskDataUrl: string | null) => {
    setEditorInpaintMask(maskDataUrl);
  }, [setEditorInpaintMask]);

  const handleSafeZoneMaskChange = useCallback((maskDataUrl: string | null) => {
    setSafeZoneMask(maskDataUrl);
  }, []);

  const modelOptions = [
    {
      value: 'gemini-2.5-flash-image',
      label: 'Flash Image',
      nickname: 'Nano Banana',
      description: 'Rapido y estable (recomendado)',
      estimatedSeconds: 15,
    },
    {
      value: 'gemini-3-pro-image-preview',
      label: 'Pro Image',
      nickname: 'Nano Banana Pro',
      description: 'Mayor calidad, mas lento (experimental)',
      estimatedSeconds: 45,
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
  const currentModelInfo = modelOptions.find(m => m.value === selectedModel);

  const handleBack = () => {
    // Cancel any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    cancelAiEdit();
    router.push(`/image/${imageId}`);
  };

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setEditorProcessing(false);
    setEditorError(null);
  };

  const handleGenerate = async () => {
    if (!editorState.prompt.trim()) return;

    // Create new AbortController for this request
    const controller = new AbortController();
    abortControllerRef.current = controller;

    // Timeout: 60s for all models
    const timeout = setTimeout(() => {
      controller.abort();
    }, 60000);

    setEditorProcessing(true);
    setEditorError(null);
    setEditorPreview(null);

    const progressId = startProgress('ai-edit', 'Generando edicion con IA...');

    try {
      updateProgress(progressId, 5, 'Preparando solicitud...');

      const request: GeminiEditApiRequest = {
        sessionId,
        imageId: currentImage.id,
        prompt: editorState.prompt,
        inpaintMaskDataUrl: editorState.inpaintMaskDataUrl || undefined,
        protectMaskDataUrl: safeZoneMask || undefined,
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

      updateProgress(progressId, 15, 'Enviando a Gemini AI...');

      const response = await fetch('/api/gemini/edit', {
        method: 'POST',
        headers,
        body: JSON.stringify(request),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      updateProgress(progressId, 80, 'Procesando resultado...');

      const data: GeminiEditApiResponse = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate edit');
      }

      updateProgress(progressId, 90, 'Guardando version...');

      const version: EditVersion = {
        id: data.newVersionId,
        timestamp: new Date(),
        prompt: editorState.prompt,
        inpaintMaskDataUrl: editorState.inpaintMaskDataUrl || undefined,
        imageUrl: data.editedImageUrl,
        thumbnailUrl: data.thumbnailUrl,
        model: selectedModel,
        processingTimeMs: data.processingTimeMs,
        originalExifDump: data.exifDump,
      };

      saveEditVersion(currentImage.id, version);

      // Persist to IndexedDB
      try {
        updateProgress(progressId, 95, 'Persistiendo en IndexedDB...');
        const [versionBlob, thumbnailBlob] = await Promise.all([
          fetch(data.editedImageUrl).then((r) => r.blob()),
          data.thumbnailUrl ? fetch(data.thumbnailUrl).then((r) => r.blob()) : Promise.resolve(undefined),
        ]);
        await persistEditVersion(currentImage.id, version, versionBlob, thumbnailBlob);
      } catch (persistError) {
        console.error('Failed to persist edit version:', persistError);
      }

      setEditorPreview(data.editedImageUrl);
      finishProgress(progressId);

      router.push(`/image/${imageId}/compare?left=original&right=model-${selectedModel}&fromEditor=true`);
    } catch (error) {
      clearTimeout(timeout);

      if (error instanceof DOMException && error.name === 'AbortError') {
        // User cancelled or timeout
        const wasTimeout = !abortControllerRef.current;
        const msg = wasTimeout
          ? 'La solicitud ha expirado (60s). Intenta con el modelo Flash que es mas rapido.'
          : 'Edicion cancelada por el usuario.';
        setEditorError(msg);
        failProgress(progressId, msg);
      } else {
        const errorMsg = error instanceof Error ? error.message : 'Failed to generate edit';
        setEditorError(errorMsg);
        failProgress(progressId, errorMsg);
      }
    } finally {
      abortControllerRef.current = null;
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
              <div className="px-4 py-2 bg-red-900/50 border border-red-700 rounded-lg text-sm max-w-md truncate">
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
                onMaskChange={handleMaskChange}
                onSafeZoneMaskChange={handleSafeZoneMaskChange}
              />
            </div>

            {/* Right: Controls */}
            <div className="space-y-6">
              <PromptInput
                value={editorState.prompt}
                onChange={(prompt) => setEditorPrompt(prompt)}
                onGenerate={handleGenerate}
                onCancel={handleCancel}
                isProcessing={editorState.isProcessing}
                processingModel={currentModelInfo?.nickname}
                estimatedSeconds={currentModelInfo?.estimatedSeconds ?? 20}
              />

              {/* Model Selector */}
              <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
                <label className="block mb-3">
                  <div className="font-medium text-gray-200 mb-1">Modelo IA</div>
                  <div className="text-xs text-gray-400 mb-3">
                    Elige el modelo para la edicion
                  </div>
                </label>
                <div className="space-y-2">
                  {modelOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setSelectedModel(option.value)}
                      disabled={editorState.isProcessing}
                      className={`w-full text-left px-4 py-3 rounded-lg border transition-all ${
                        selectedModel === option.value
                          ? 'bg-blue-900/30 border-blue-500 text-white'
                          : 'bg-gray-700/50 border-gray-600 text-gray-300 hover:border-gray-500'
                      } disabled:opacity-50`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{option.label}</div>
                          <div className="text-xs text-gray-400">{option.description}</div>
                        </div>
                        <div className="text-xs text-gray-500">~{option.estimatedSeconds}s</div>
                      </div>
                    </button>
                  ))}
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
                    <div className="font-medium text-gray-200">Preservar Metadata</div>
                    <div className="text-xs text-gray-400">
                      Mantener EXIF, GPS e informacion de camara
                    </div>
                  </div>
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>
  );
}
