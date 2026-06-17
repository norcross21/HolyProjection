// Detect and target physical displays (e.g. a projector / USB monitor) using the
// browser Window Management API (Chrome/Edge). Falls back gracefully where it's
// unsupported (Safari/Firefox) — the caller then opens a normal window to drag.

export interface ScreenInfo {
  id: number;
  label: string;
  isPrimary: boolean;
  isInternal: boolean;
  left: number;
  top: number;
  width: number;
  height: number;
}

export function screensSupported(): boolean {
  return typeof window !== 'undefined' && 'getScreenDetails' in window;
}

/**
 * Returns the list of connected screens, or null if the browser doesn't support
 * it (or the user declined the permission). Must be called from a user gesture.
 */
export async function getScreens(): Promise<ScreenInfo[] | null> {
  if (!screensSupported()) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const details: any = await (window as any).getScreenDetails();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (details.screens as any[]).map((s, i) => ({
      id: i,
      label: s.label || (s.isInternal ? 'Built-in display' : `Display ${i + 1}`),
      isPrimary: Boolean(s.isPrimary),
      isInternal: Boolean(s.isInternal),
      left: s.availLeft ?? s.left ?? 0,
      top: s.availTop ?? s.top ?? 0,
      width: s.availWidth ?? s.width ?? 1280,
      height: s.availHeight ?? s.height ?? 720,
    }));
  } catch {
    return null;
  }
}

/** Open a URL in a window positioned to fill the given screen. */
export function openOnScreen(url: string, screen: ScreenInfo): Window | null {
  const features = `popup=yes,left=${screen.left},top=${screen.top},width=${screen.width},height=${screen.height}`;
  const w = window.open(url, `hp_proj_${screen.id}`, features);
  try {
    w?.moveTo(screen.left, screen.top);
    w?.resizeTo(screen.width, screen.height);
    w?.focus();
  } catch {
    /* cross-origin / blocked move — window still opened */
  }
  return w;
}
