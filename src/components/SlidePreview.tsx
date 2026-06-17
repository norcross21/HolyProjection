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

  return (
    <div
      className="relative w-full h-full overflow-hidden"
      style={{ backgroundColor: bg, containerType: 'size', fontFamily: settings.fontFamily || 'Inter' } as React.CSSProperties}
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
              style={{ fontSize: '10cqh', textAlign: settings.textAlign || 'center' }}
            >
              {(slide.content || '').split('\n').slice(0, 4).join('\n') || ' '}
            </div>
            {slide.translation && (
              <div
                dir={dirFor(settings.translationLang)}
                className="text-indigo-300 font-semibold whitespace-pre-line break-words"
                style={{ fontSize: '8cqh', marginTop: '2cqh' }}
              >
                {slide.translation.split('\n').slice(0, 3).join('\n')}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
