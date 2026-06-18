'use client';

import { useEffect } from 'react';

/** Registers the service worker in production for offline / live reliability. */
export default function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (!('serviceWorker' in navigator)) return;
    const onLoad = () => navigator.serviceWorker.register('/sw.js').catch(() => {});
    window.addEventListener('load', onLoad);
    return () => window.removeEventListener('load', onLoad);
  }, []);
  return null;
}
