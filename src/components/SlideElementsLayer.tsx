'use client';

import { SlideElement } from '@/utils/sync';

/**
 * Renders a slide's free-placement elements (Phase 2) as an absolutely-positioned
 * layer. Must be placed inside a relatively-positioned, full-size container.
 * Positions/sizes are percentages and text uses `cqh` units, so the parent should
 * set `container-type: size` for text to scale to the container height.
 */
export default function SlideElementsLayer({
  elements,
  fontFamily,
}: {
  elements?: SlideElement[];
  fontFamily?: string;
}) {
  if (!elements || elements.length === 0) return null;

  return (
    <div
      className="absolute inset-0 z-[5] pointer-events-none"
      style={{ containerType: 'size' } as React.CSSProperties}
    >
      {[...elements].sort((a, b) => a.z - b.z).map((el) => (
        <div
          key={el.id}
          className="absolute"
          style={{ left: `${el.x}%`, top: `${el.y}%`, width: `${el.w}%`, height: `${el.h}%`, zIndex: el.z }}
        >
          {el.type === 'text' ? (
            <div
              className="w-full h-full flex items-center"
              style={{
                color: el.color || '#fff',
                fontSize: `${el.fontSize || 7}cqh`,
                fontWeight: el.bold ? 800 : 400,
                textAlign: el.align || 'center',
                justifyContent: el.align === 'left' ? 'flex-start' : el.align === 'right' ? 'flex-end' : 'center',
                lineHeight: 1.1,
                textShadow: '0 2px 12px rgba(0,0,0,0.6)',
                fontFamily: fontFamily || 'Inter',
              }}
            >
              <span className="whitespace-pre-wrap break-words w-full">{el.text}</span>
            </div>
          ) : el.type === 'image' ? (
            <img src={el.url} alt="" className="w-full h-full" style={{ objectFit: el.fit || 'contain' }} />
          ) : (
            <video src={el.url} muted loop autoPlay playsInline className="w-full h-full" style={{ objectFit: el.fit || 'contain' }} />
          )}
        </div>
      ))}
    </div>
  );
}
