'use client';

import { useState } from 'react';
import { useImageStore } from '@/hooks/useImageStore';
import InpaintingCanvas from './InpaintingCanvas';
import PromptInput from './PromptInput';
import { GeminiEditApiRequest, GeminiEditApiResponse } from '@/types/api';
import { EditVersion } from '@/types/image';

export default function ImageEditor() {
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

  const [preserveExif, setPreserveExif] = useState(true);
  const [showPreview, setShowPreview] = useState(false);

  if (!editorState) {
    return null;
  }

  const currentImage = images.find((img) => img.id === editorState.imageId);
  if (!currentImage) {
    return <div className="text-white">Image not found</div>;
  }

  const imageUrl = `/api/image?sessionId=${sessionId}&id=${currentImage.id}`;

  const handleGenerate = async () => {
    if (!editorState.prompt.trim()) return;

    setEditorProcessing(true);
    setEditorError(null);
    setEditorPreview(null);

    try {
      const request: GeminiEditApiRequest = {
        sessionId,
        imageId: currentImage.id,
        prompt: editorState.prompt,
        maskDataUrl: editorState.maskDataUrl || undefined,
        preserveExif,
      };

      // Get user's API key from localStorage if available
      const userApiKey = typeof window !== 'undefined'
        ? localStorage.getItem('gemini_api_key')
        : null;

      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      if (userApiKey) {
        headers['x-gemini-api-key'] = userApiKey;
      }

      const response = await fetch('/api/gemini/edit', {
        method: 'POST',
        headers,
        body: JSON.stringify(request),
      });

      const data: GeminiEditApiResponse = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate edit');
      }

      // Save edit version
      const version: EditVersion = {
        id: data.newVersionId,
        timestamp: new Date(),
        prompt: editorState.prompt,
        maskDataUrl: editorState.maskDataUrl || undefined,
        imageUrl: data.editedImageUrl,
        thumbnailUrl: data.thumbnailUrl,
      };

      saveEditVersion(currentImage.id, version);

      // Show success and return to detail view
      setEditorPreview(data.editedImageUrl);
      setShowPreview(true);
    } catch (error) {
      console.error('Error generating edit:', error);
      setEditorError(
        error instanceof Error ? error.message : 'Failed to generate edit'
      );
    } finally {
      setEditorProcessing(false);
    }
  };

  const handleAccept = () => {
    // Already saved, just return to detail view
    cancelAiEdit();
  };

  const handleRefine = () => {
    setShowPreview(false);
    setEditorPreview(null);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => cancelAiEdit()}
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
        {showPreview && editorState.previewUrl ? (
          /* Preview Mode */
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-semibold mb-2">Edit Complete!</h2>
              <p className="text-gray-400">Your edited image is ready.</p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-medium text-gray-400 mb-2">Original</h3>
                <img
                  src={imageUrl}
                  alt="Original"
                  className="w-full rounded-lg border border-gray-700"
                />
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-400 mb-2">Edited</h3>
                <img
                  src={editorState.previewUrl}
                  alt="Edited"
                  className="w-full rounded-lg border border-gray-700"
                />
              </div>
            </div>

            <div className="flex gap-4 justify-center">
              <button
                onClick={handleAccept}
                className="px-6 py-3 bg-green-600 hover:bg-green-700 rounded-lg font-medium transition-colors"
              >
                Accept & Return
              </button>
              <button
                onClick={handleRefine}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors"
              >
                Refine Further
              </button>
              <button
                onClick={() => cancelAiEdit()}
                className="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium transition-colors"
              >
                Discard
              </button>
            </div>
          </div>
        ) : (
          /* Editor Mode */
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Left: Canvas */}
            <div className="lg:col-span-2">
              <InpaintingCanvas
                imageUrl={imageUrl}
                onMaskChange={(maskDataUrl) => setEditorMask(maskDataUrl)}
              />
            </div>

            {/* Right: Controls */}
            <div className="space-y-6">
              <PromptInput
                value={editorState.prompt}
                onChange={(prompt) => setEditorPrompt(prompt)}
                onGenerate={handleGenerate}
                isProcessing={editorState.isProcessing}
              />

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
        )}
      </div>
    </div>
  );
}
