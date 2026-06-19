'use client';

/**
 * HolyProjection brand mark + wordmark.
 *
 * The mark is a radiant "light" star (projection + a subtle cross of light) on a
 * soft indigo→violet gradient tile. Rendered inline so it stays crisp at any size
 * and matches the app's font for the wordmark.
 */
export function LogoMark({ size = 32, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="hp-tile" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#6366f1" />
          <stop offset="0.55" stopColor="#7c5cf0" />
          <stop offset="1" stopColor="#a855f7" />
        </linearGradient>
        <radialGradient id="hp-glow" cx="0.5" cy="0.46" r="0.55">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.9" />
          <stop offset="0.5" stopColor="#ffffff" stopOpacity="0.18" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="512" height="512" rx="120" fill="url(#hp-tile)" />
      <circle cx="256" cy="236" r="150" fill="url(#hp-glow)" />
      <g fill="#ffffff">
        <path d="M256 96 L284 208 L396 236 L284 264 L256 376 L228 264 L116 236 L228 208 Z" />
        <path opacity="0.55" transform="rotate(45 256 236)" d="M256 146 L275 217 L346 236 L275 255 L256 326 L237 255 L166 236 L237 217 Z" />
        <circle cx="256" cy="236" r="15" />
      </g>
    </svg>
  );
}

export default function Logo({
  size = 32,
  withText = true,
  className = '',
  textClassName = 'text-slate-900',
}: {
  size?: number;
  withText?: boolean;
  className?: string;
  textClassName?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark size={size} className="shrink-0 drop-shadow-sm" />
      {withText && (
        <span className={`font-extrabold tracking-tight leading-none ${textClassName}`} style={{ fontSize: size * 0.6 }}>
          Holy<span className="bg-gradient-to-r from-indigo-500 to-violet-500 bg-clip-text text-transparent">Projection</span>
        </span>
      )}
    </span>
  );
}
