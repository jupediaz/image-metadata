'use client';

import { useEffect, useState } from 'react';
import heic2any from 'heic2any';

interface HeicImageProps {
  src: string;
  alt: string;
  className?: string;
  onClick?: () => void;
  loading?: 'lazy' | 'eager';
}

export function HeicImage({ src, alt, className, onClick, loading }: HeicImageProps) {
  const [displaySrc, setDisplaySrc] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let objectUrl: string | null = null;
    let mounted = true;

    async function convertHeic() {
      try {
        setIsLoading(true);
        setError(false);

        // Fetch the HEIC file
        const response = await fetch(src);
        if (!response.ok) {
          throw new Error(`Failed to fetch: ${response.statusText}`);
        }

        const blob = await response.blob();

        // Check if it's actually a HEIC file
        if (!blob.type.includes('heic') && !blob.type.includes('heif')) {
          console.warn('File is not HEIC, might already be converted:', blob.type);
          // If it's already converted to another format, just use it
          if (blob.type.startsWith('image/')) {
            objectUrl = URL.createObjectURL(blob);
            if (mounted) {
              setDisplaySrc(objectUrl);
              setIsLoading(false);
            }
            return;
          }
        }

        // Convert to JPEG blob for display
        const convertedBlob = await heic2any({
          blob,
          toType: 'image/jpeg',
          quality: 0.9,
        });

        // Create object URL for display
        const blobToUse = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;
        objectUrl = URL.createObjectURL(blobToUse);

        if (mounted) {
          setDisplaySrc(objectUrl);
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Failed to convert HEIC:', err);
        if (mounted) {
          setError(true);
          setIsLoading(false);
        }
      }
    }

    convertHeic();

    // Cleanup
    return () => {
      mounted = false;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [src]);

  if (error) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 dark:bg-gray-800 ${className}`}>
        <div className="text-center p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Error loading HEIC</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Download to view</p>
        </div>
      </div>
    );
  }

  if (isLoading || !displaySrc) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 dark:bg-gray-800 animate-pulse ${className}`}>
        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>
    );
  }

  return (
    <img
      src={displaySrc}
      alt={alt}
      className={className}
      onClick={onClick}
      loading={loading}
    />
  );
}
