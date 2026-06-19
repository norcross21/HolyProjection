// A curated set of ~20 built-in backgrounds for slides. Each `value` is a plain
// CSS `background` string (gradient), so it needs no asset hosting and renders
// identically on the projector, stage, follower and editor preview. Apply by
// storing the value in a slide's settings.bgColor or the presentation's
// settings.background, then rendering with `style={{ background: value }}`.

export interface BackgroundPreset {
  id: string;
  name: string;
  value: string; // CSS background shorthand
}

export const BACKGROUNDS: BackgroundPreset[] = [
  { id: 'midnight', name: 'Midnight', value: 'linear-gradient(160deg, #0f172a 0%, #1e293b 100%)' },
  { id: 'deep-ocean', name: 'Deep Ocean', value: 'linear-gradient(160deg, #0c4a6e 0%, #082f49 100%)' },
  { id: 'royal', name: 'Royal', value: 'linear-gradient(160deg, #1e1b4b 0%, #4c1d95 100%)' },
  { id: 'amethyst', name: 'Amethyst', value: 'linear-gradient(160deg, #2e1065 0%, #6d28d9 100%)' },
  { id: 'sunset', name: 'Sunset', value: 'linear-gradient(160deg, #7c2d12 0%, #b45309 50%, #f59e0b 100%)' },
  { id: 'dawn', name: 'Dawn', value: 'linear-gradient(160deg, #312e81 0%, #be185d 100%)' },
  { id: 'forest', name: 'Forest', value: 'linear-gradient(160deg, #052e16 0%, #166534 100%)' },
  { id: 'teal', name: 'Teal', value: 'linear-gradient(160deg, #042f2e 0%, #0d9488 100%)' },
  { id: 'slate', name: 'Slate', value: 'linear-gradient(160deg, #1e293b 0%, #475569 100%)' },
  { id: 'charcoal', name: 'Charcoal', value: 'linear-gradient(160deg, #0a0a0a 0%, #262626 100%)' },
  { id: 'crimson', name: 'Crimson', value: 'linear-gradient(160deg, #450a0a 0%, #b91c1c 100%)' },
  { id: 'plum-gold', name: 'Plum & Gold', value: 'linear-gradient(135deg, #4a044e 0%, #86198f 60%, #ca8a04 100%)' },
  { id: 'aurora', name: 'Aurora', value: 'linear-gradient(135deg, #064e3b 0%, #0e7490 50%, #6366f1 100%)' },
  { id: 'twilight', name: 'Twilight', value: 'linear-gradient(180deg, #0f172a 0%, #1e3a8a 60%, #7c3aed 100%)' },
  { id: 'ember', name: 'Ember', value: 'linear-gradient(180deg, #1c1917 0%, #7c2d12 70%, #ea580c 100%)' },
  { id: 'spotlight', name: 'Spotlight', value: 'radial-gradient(circle at 50% 30%, #334155 0%, #0f172a 70%)' },
  { id: 'halo', name: 'Halo', value: 'radial-gradient(circle at 50% 35%, #4c1d95 0%, #1e1b4b 65%)' },
  { id: 'glow', name: 'Warm Glow', value: 'radial-gradient(circle at 50% 40%, #92400e 0%, #1c1917 70%)' },
  { id: 'ink', name: 'Ink', value: 'linear-gradient(160deg, #020617 0%, #0f172a 100%)' },
  { id: 'pure-black', name: 'Pure Black', value: '#000000' },
  { id: 'pure-white', name: 'Pure White', value: '#ffffff' },
  { id: 'parchment', name: 'Parchment', value: 'linear-gradient(160deg, #fef3c7 0%, #fde68a 100%)' },
];
