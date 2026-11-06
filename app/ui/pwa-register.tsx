'use client';

import { useEffect } from 'react';

/** Registers the offline-fallback service worker in production only. */
export default function PwaRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Not critical: the site works the same without it.
    });
  }, []);
  return null;
}
