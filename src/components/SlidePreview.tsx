'use client';

import { Slide, Presentation } from '@/utils/sync';
import SlideElementsLayer from './SlideElementsLayer';
import { dirFor } from '@/utils/languages';

/**
 * A faithful miniature of a slide — used for running-order thumbnails and the
 * editor preview. Fills its parent (which must set the size, e.g. aspect-video)
 * and uses container-query units so text scales with the thumbnail size.
 */
export default function SlidePreview({ slide, settings }: { slide: Slide; settings: Presentation['settings'] }) {
  const bg = slide.settings?.bgColor || settings.background || '#0f172a';
  const hasElements = (slide.elements?.length ?? 0) > 0;
  const fill = Boolean(slide.media_fill && slide.media_url);
  const dimmed = !fill && !hasElements;

  // Shrink-to-fit heuristic so long verses don't overflow the thumbnail — mirrors
  // the projector's auto-fit so the preview is faithful. More/longer lines → smaller.
  const lines = (slide.content || '').split('\n');
  const lineCount = Math.max(lines.length, 1);
  const longest = lines.reduce((m, l) => Math.max(m, l.length), 0);
  const primarySize = Math.max(4, Math.min(11, 11 - Math.max(0, lineCount - 2) * 1.15 - Math.max(0, longest - 24) * 0.16));
  const translationSize = Math.max(3.4, primarySize * 0.8);

  return (
    <div
      className="relative w-full h-full overflow-hidden"
      style={{ background: bg, containerType: 'size', fontFamily: settings.fontFamily || 'Inter' } as React.CSSProperties}
    >
      {slide.media_type === 'image' && slide.media_url && (
        <img src={slide.media_url} alt="" className={`absolute inset-0 w-full h-full object-cover ${dimmed ? 'brightness-[0.5]' : ''}`} />
      )}
      {slide.media_type === 'video' && slide.media_url && (
        <video src={slide.media_url} muted playsInline preload="metadata" className={`absolute inset-0 w-full h-full object-cover ${dimmed ? 'brightness-[0.5]' : ''}`} />
      )}

      {hasElements ? (
        <SlideElementsLayer elements={slide.elements} fontFamily={settings.fontFamily} />
      ) : !fill ? (
        <div className="absolute inset-0 flex items-center justify-center text-center" style={{ padding: '6cqw' }}>
          <div className="w-full">
            <div
              className="text-white font-bold leading-tight whitespace-pre-line break-words"
              style={{ fontSize: `${primarySize}cqh`, textAlign: settings.textAlign || 'center' }}
            >
              {slide.content || ' '}
            </div>
            {slide.translation && (
              <div
                dir={dirFor(settings.translationLang)}
                className="text-indigo-300 font-semibold whitespace-pre-line break-words"
                style={{ fontSize: `${translationSize}cqh`, marginTop: '2cqh' }}
              >
                {slide.translation}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
