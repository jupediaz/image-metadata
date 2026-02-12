'use client';

import { useEffect } from 'react';
import { useImageStore } from './useImageStore';
import { persistImage, persistImageMetadata, deletePersistedImage } from '@/lib/persistence';

/**
 * Auto-persists image store changes to IndexedDB.
 * Call once in PersistenceProvider after hydration.
 */
export function useAutoPersist() {
  useEffect(() => {

    // Subscribe to images array changes
    const unsubImages = useImageStore.subscribe(
      (state) => state.images,
      async (images, prevImages) => {
        // Find new images (added)
        const newImages = images.filter(
          (img) => !prevImages.find((prev) => prev.id === img.id)
        );

        // Find removed images
        const removedIds = prevImages
          .filter((prev) => !images.find((img) => img.id === prev.id))
          .map((img) => img.id);

        // Find updated images (metadata changed)
        const updatedImages = images.filter((img) => {
          const prev = prevImages.find((p) => p.id === img.id);
          if (!prev) return false;
          // Check if metadata or editHistory changed
          return (
            JSON.stringify(img.metadata) !== JSON.stringify(prev.metadata) ||
            JSON.stringify(img.editHistory) !== JSON.stringify(prev.editHistory) ||
            img.currentVersionIndex !== prev.currentVersionIndex
          );
        });

        // Persist new images
        for (const img of newImages) {
          try {
            // Fetch original blob from server
            const sessionId = useImageStore.getState().sessionId;
            const response = await fetch(`/api/image?sessionId=${sessionId}&id=${img.id}`);
            if (response.ok) {
              const blob = await response.blob();

              // Fetch thumbnail if available
              let thumbnailBlob: Blob | undefined;
              if (img.thumbnailUrl) {
                const thumbResponse = await fetch(img.thumbnailUrl);
                if (thumbResponse.ok) {
                  thumbnailBlob = await thumbResponse.blob();
                }
              }

              await persistImage(img, blob, thumbnailBlob);
              console.log(`✅ Persisted new image: ${img.filename}`);
            }
          } catch (error) {
            console.error(`Failed to persist image ${img.id}:`, error);
          }
        }

        // Delete removed images
        for (const id of removedIds) {
          try {
            await deletePersistedImage(id);
            console.log(`🗑️ Deleted persisted image: ${id}`);
          } catch (error) {
            console.error(`Failed to delete image ${id}:`, error);
          }
        }

        // Update changed images (metadata only, no blobs)
        for (const img of updatedImages) {
          try {
            await persistImageMetadata(img.id, {
              metadata: img.metadata ? JSON.stringify(img.metadata) : null,
              editHistory: img.editHistory ? JSON.stringify(img.editHistory) : null,
              currentVersionIndex: img.currentVersionIndex ?? -1,
            });
            console.log(`📝 Updated metadata: ${img.filename}`);
          } catch (error) {
            console.error(`Failed to update image ${img.id}:`, error);
          }
        }
      },
      {
        equalityFn: (a, b) => a.length === b.length && a.every((img, i) => img.id === b[i]?.id),
      }
    );

    return () => {
      unsubImages();
    };
  }, []);
}
