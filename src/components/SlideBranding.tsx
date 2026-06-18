'use client';

import { Presentation } from '@/utils/sync';

const POS: Record<string, string> = {
  'top-left': 'top-[3vmin] left-[3vmin]',
  'top-right': 'top-[3vmin] right-[3vmin]',
  'bottom-left': 'bottom-[3vmin] left-[3vmin]',
  'bottom-right': 'bottom-[3vmin] right-[3vmin]',
};

/**
 * Persistent branding overlay (church logo + optional lower-third banner) shown
 * on every slide of a presentation. Presentation-wide; pointer-events-none.
 */
export default function SlideBranding({ settings }: { settings: Presentation['settings'] }) {
  if (!settings.brandShow) return null;
  const pos = POS[settings.brandLogoPos || 'bottom-right'];
  const size = settings.brandLogoSize || 8;

  return (
    <div className="absolute inset-0 z-30 pointer-events-none">
      {settings.brandLogoUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={settings.brandLogoUrl} alt="" className={`absolute ${pos} object-contain drop-shadow-lg`} style={{ height: `${size}vh` }} />
      )}
      {settings.brandLowerThird && (
        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent pt-[6vh] pb-[2.5vh] text-center">
          <span className="text-white font-bold drop-shadow-md" style={{ fontSize: '3.4vh', fontFamily: settings.fontFamily || 'Inter' }}>
            {settings.brandLowerThird}
          </span>
        </div>
      )}
    </div>
  );
}
