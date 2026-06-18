import { Presentation } from '@/utils/sync';

// Quick "look" presets applied to the whole presentation (settings). Kept to
// dark backgrounds so the projector's light lyric text stays readable.
export interface Theme {
  name: string;
  swatch: string; // preview colour
  settings: Partial<Presentation['settings']>;
}

export const THEMES: Theme[] = [
  { name: 'Classic Slate', swatch: '#0f172a', settings: { background: '#0f172a', fontFamily: 'Inter', textShadow: 'subtle', textOutline: 'none', textAlign: 'center', verticalAlign: 'center' } },
  { name: 'Midnight', swatch: '#0b1220', settings: { background: '#0b1220', fontFamily: 'Montserrat', textShadow: 'strong', textOutline: 'none', textAlign: 'center', verticalAlign: 'center' } },
  { name: 'Pure Black', swatch: '#000000', settings: { background: '#000000', fontFamily: 'Oswald', textShadow: 'strong', textOutline: 'none', textAlign: 'center', verticalAlign: 'center' } },
  { name: 'Royal', swatch: '#1e1b4b', settings: { background: '#1e1b4b', fontFamily: 'Playfair Display', textShadow: 'subtle', textOutline: 'none', textAlign: 'center', verticalAlign: 'center' } },
  { name: 'Forest', swatch: '#052e16', settings: { background: '#052e16', fontFamily: 'Lora', textShadow: 'subtle', textOutline: 'none', textAlign: 'center', verticalAlign: 'center' } },
  { name: 'Charcoal', swatch: '#111827', settings: { background: '#111827', fontFamily: 'Poppins', textShadow: 'subtle', textOutline: 'none', textAlign: 'center', verticalAlign: 'center' } },
  { name: 'Ocean', swatch: '#082f49', settings: { background: '#082f49', fontFamily: 'Raleway', textShadow: 'subtle', textOutline: 'none', textAlign: 'center', verticalAlign: 'center' } },
  { name: 'Bold Outline', swatch: '#18181b', settings: { background: '#18181b', fontFamily: 'Anton', textShadow: 'none', textOutline: 'strong', textAlign: 'center', verticalAlign: 'center' } },
];
