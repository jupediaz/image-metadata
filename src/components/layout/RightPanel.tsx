'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useImageStore } from '@/hooks/useImageStore';
import PromptInput from '../editor/PromptInput';
import { MetadataPanel } from '../metadata/MetadataPanel';
import { GeminiEditApiRequest, GeminiEditApiResponse } from '@/types/api';
import { EditVersion } from '@/types/image';
import dynamic from 'next/dynamic';

const EditHistory = dynamic(() => import('../editor/EditHistory'), { ssr: false });

interface RightPanelProps {
  imageId: string;
  activeTab: 'ai' | 'properties' | 'history';
  onTabChange: (tab: 'ai' | 'properties' | 'history') => void;
}

const tabs = [
  { id: 'ai' as const, label: 'AI' },
  { id: 'properties' as const, label: 'Properties' },
  { id: 'history' as const, label: 'History' },
];

export default function RightPanel({ imageId, activeTab, onTabChange }: RightPanelProps) {
  return (
    <div className="flex flex-col bg-[#252526] border-l border-[#3c3c3c] overflow-hidden">
      {/* Tab bar */}
      <div className="flex border-b border-[#3c3c3c] shrink-0">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
              activeTab === tab.id
                ? 'text-white bg-[#1e1e1e] border-b-2 border-blue-500'
                : 'text-[#858585] hover:text-[#cccccc] hover:bg-[#2d2d2d]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'ai' && <AITab imageId={imageId} />}
        {activeTab === 'properties' && <PropertiesTab imageId={imageId} />}
        {activeTab === 'history' && <HistoryTab imageId={imageId} />}
      </div>
    </div>
  );
}

function AITab({ imageId }: { imageId: string }) {
  const router = useRouter();
  const {
    editorState,
    sessionId,
    images,
    setEditorPrompt,
    setEditorProcessing,
    setEditorPreview,
    setEditorError,
    saveEditVersion,
    cancelAiEdit,
  } = useImageStore();

  const [preserveExif, setPreserveExif] = useState(true);
  const [selectedModels, setSelectedModels] = useState<string[]>(['gemini-2.5-flash-image']);

  const modelOptions = [
    {
      value: 'gemini-2.5-flash-image',
      label: 'Flash Image',
      description: 'Fast generation (recommended)',
    },
    {
      value: 'gemini-3-pro-image-preview',
      label: 'Pro Image',
      description: 'Highest quality (slower)',
    },
  ];

  const currentImage = images.find((img) => img.id === imageId);
  if (!editorState || !currentImage) return null;

  const toggleModelSelection = (model: string) => {
    setSelectedModels((prev) => {
      if (prev.includes(model)) {
        return prev.length > 1 ? prev.filter((m) => m !== model) : prev;
      }
      return [...prev, model];
    });
  };

  const handleGenerate = async () => {
    if (!editorState.prompt.trim()) return;

    // Multi-model: both selected -> go to comparison
    if (selectedModels.length > 1) {
      // Generate both in parallel, navigate to compare
      setEditorProcessing(true);
      setEditorError(null);

      try {
        const userApiKey = typeof window !== 'undefined'
          ? localStorage.getItem('gemini_api_key')
          : null;
        const headers: HeadersInit = { 'Content-Type': 'application/json' };
        if (userApiKey) headers['x-gemini-api-key'] = userApiKey;

        const results = await Promise.all(
          selectedModels.map(async (model) => {
            const request: GeminiEditApiRequest = {
              sessionId,
              imageId: currentImage.id,
              prompt: editorState.prompt,
              maskDataUrl: editorState.maskDataUrl || undefined,
              preserveExif,
              model,
            };

            const response = await fetch('/api/gemini/edit', {
              method: 'POST',
              headers,
              body: JSON.stringify(request),
            });

            const data: GeminiEditApiResponse = await response.json();
            if (!response.ok || !data.success) {
              throw new Error(data.error || `Failed with ${model}`);
            }

            const version: EditVersion = {
              id: data.newVersionId,
              timestamp: new Date(),
              prompt: editorState.prompt,
              maskDataUrl: editorState.maskDataUrl || undefined,
              imageUrl: data.editedImageUrl,
              thumbnailUrl: data.thumbnailUrl,
              model,
            };

            saveEditVersion(currentImage.id, version);
            return { model, version };
          })
        );

        // Navigate to comparison view
        const leftModel = results[0]?.model || 'original';
        const rightModel = results[1]?.model || 'original';
        cancelAiEdit();
        router.push(
          `/image/${imageId}/compare?left=model-${leftModel}&right=model-${rightModel}`
        );
      } catch (error) {
        setEditorError(
          error instanceof Error ? error.message : 'Failed to generate'
        );
      } finally {
        setEditorProcessing(false);
      }
      return;
    }

    // Single model
    setEditorProcessing(true);
    setEditorError(null);
    setEditorPreview(null);

    try {
      const model = selectedModels[0];
      const request: GeminiEditApiRequest = {
        sessionId,
        imageId: currentImage.id,
        prompt: editorState.prompt,
        maskDataUrl: editorState.maskDataUrl || undefined,
        preserveExif,
        model,
      };

      const userApiKey = typeof window !== 'undefined'
        ? localStorage.getItem('gemini_api_key')
        : null;
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (userApiKey) headers['x-gemini-api-key'] = userApiKey;

      const response = await fetch('/api/gemini/edit', {
        method: 'POST',
        headers,
        body: JSON.stringify(request),
      });

      const data: GeminiEditApiResponse = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate edit');
      }

      const version: EditVersion = {
        id: data.newVersionId,
        timestamp: new Date(),
        prompt: editorState.prompt,
        maskDataUrl: editorState.maskDataUrl || undefined,
        imageUrl: data.editedImageUrl,
        thumbnailUrl: data.thumbnailUrl,
        model,
      };

      saveEditVersion(currentImage.id, version);
      setEditorPreview(data.editedImageUrl);
    } catch (error) {
      setEditorError(
        error instanceof Error ? error.message : 'Failed to generate edit'
      );
    } finally {
      setEditorProcessing(false);
    }
  };

  return (
    <div className="p-3 space-y-4">
      {/* Prompt */}
      <PromptInput
        value={editorState.prompt}
        onChange={(prompt) => setEditorPrompt(prompt)}
        onGenerate={handleGenerate}
        isProcessing={editorState.isProcessing}
      />

      {/* Model Selector - checkboxes for multi-model */}
      <div className="p-3 bg-[#1e1e1e] rounded border border-[#3c3c3c]">
        <div className="text-xs font-medium text-[#cccccc] mb-2">AI Model</div>
        <div className="space-y-2">
          {modelOptions.map((option) => (
            <label
              key={option.value}
              className="flex items-center gap-2 cursor-pointer group"
            >
              <input
                type="checkbox"
                checked={selectedModels.includes(option.value)}
                onChange={() => toggleModelSelection(option.value)}
                disabled={editorState.isProcessing}
                className="w-3.5 h-3.5 rounded border-[#3c3c3c] bg-[#2d2d2d] text-blue-500 focus:ring-1 focus:ring-blue-500 focus:ring-offset-0"
              />
              <div>
                <span className="text-xs text-[#cccccc] group-hover:text-white">
                  {option.label}
                </span>
                <span className="text-[10px] text-[#585858] ml-1">
                  {option.description}
                </span>
              </div>
            </label>
          ))}
        </div>
        {selectedModels.length > 1 && (
          <p className="text-[10px] text-blue-400 mt-2">
            Both models will run in parallel. Results open in comparison view.
          </p>
        )}
      </div>

      {/* EXIF Toggle */}
      <label className="flex items-center gap-2 cursor-pointer p-3 bg-[#1e1e1e] rounded border border-[#3c3c3c]">
        <input
          type="checkbox"
          checked={preserveExif}
          onChange={(e) => setPreserveExif(e.target.checked)}
          disabled={editorState.isProcessing}
          className="w-3.5 h-3.5 rounded border-[#3c3c3c] bg-[#2d2d2d] text-blue-500 focus:ring-1 focus:ring-blue-500 focus:ring-offset-0"
        />
        <div>
          <span className="text-xs text-[#cccccc]">Preserve Metadata</span>
          <p className="text-[10px] text-[#585858]">Keep original EXIF/GPS data</p>
        </div>
      </label>

      {/* Error */}
      {editorState.error && (
        <div className="p-2 bg-red-900/30 border border-red-700/50 rounded text-xs text-red-300">
          {editorState.error}
        </div>
      )}
    </div>
  );
}

function PropertiesTab({ imageId }: { imageId: string }) {
  const images = useImageStore((s) => s.images);
  const image = images.find((img) => img.id === imageId);

  if (!image) return null;

  return (
    <div className="text-xs">
      <MetadataPanel image={image} />
    </div>
  );
}

function HistoryTab({ imageId }: { imageId: string }) {
  const images = useImageStore((s) => s.images);
  const sessionId = useImageStore((s) => s.sessionId);
  const revertToVersion = useImageStore((s) => s.revertToVersion);
  const image = images.find((img) => img.id === imageId);

  if (!image) return null;

  if (!image.editHistory || image.editHistory.length === 0) {
    return (
      <div className="p-4 text-center text-xs text-[#585858]">
        No edit history yet. Use the AI panel to make edits.
      </div>
    );
  }

  return (
    <div className="p-3">
      <EditHistory
        versions={image.editHistory}
        currentVersionIndex={image.currentVersionIndex}
        onRevert={(index) => revertToVersion(image.id, index)}
        sessionId={sessionId}
      />
    </div>
  );
}
