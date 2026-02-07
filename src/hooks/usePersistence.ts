'use client';

import { useEffect, useState, useRef } from 'react';
import { useImageStore } from './useImageStore';
import { hydrateFromDB, persistSession } from '@/lib/persistence';

/**
 * Gates rendering until IndexedDB hydration is complete.
 * Call once in the root layout.
 */
export function usePersistence() {
  const [hydrated, setHydrated] = useState(false);
  const hydrating = useRef(false);

  useEffect(() => {
    if (hydrating.current) return;
    hydrating.current = true;

    hydrateFromDB()
      .then(({ images, sessionId }) => {
        const store = useImageStore.getState();

        if (images.length > 0) {
          store.hydrate(images, sessionId ?? store.sessionId);
        }

        setHydrated(true);
      })
      .catch((err) => {
        console.error('Failed to hydrate from IndexedDB:', err);
        setHydrated(true); // continue without persisted data
      });
  }, []);

  // Persist session whenever activeImageId changes
  useEffect(() => {
    if (!hydrated) return;

    const unsub = useImageStore.subscribe(
      (state) => ({
        sessionId: state.sessionId,
        activeImageId: state.activeImageId,
      }),
      (curr) => {
        persistSession({
          sessionId: curr.sessionId,
          activeImageId: curr.activeImageId,
        }).catch(console.error);
      },
    );

    return unsub;
  }, [hydrated]);

  return hydrated;
}
