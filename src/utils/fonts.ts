// Curated font list for the slide designer. `family` is the CSS font-family value.
// All of these are loaded globally (see the Google Fonts link in layout.tsx) so
// they render on every screen — editor, projector, follower and stage.

export interface FontOption {
  label: string;
  family: string;
  category: 'Sans' | 'Serif' | 'Display' | 'Script';
}

export const FONTS: FontOption[] = [
  { label: 'Inter', family: 'Inter', category: 'Sans' },
  { label: 'Montserrat', family: 'Montserrat', category: 'Sans' },
  { label: 'Poppins', family: 'Poppins', category: 'Sans' },
  { label: 'Outfit', family: 'Outfit', category: 'Sans' },
  { label: 'Roboto', family: 'Roboto', category: 'Sans' },
  { label: 'Lato', family: 'Lato', category: 'Sans' },
  { label: 'Raleway', family: 'Raleway', category: 'Sans' },
  { label: 'Nunito', family: 'Nunito', category: 'Sans' },
  { label: 'Work Sans', family: 'Work Sans', category: 'Sans' },
  { label: 'Josefin Sans', family: 'Josefin Sans', category: 'Sans' },
  { label: 'Quicksand', family: 'Quicksand', category: 'Sans' },
  { label: 'Oswald', family: 'Oswald', category: 'Display' },
  { label: 'Bebas Neue', family: 'Bebas Neue', category: 'Display' },
  { label: 'Anton', family: 'Anton', category: 'Display' },
  { label: 'Archivo Black', family: 'Archivo Black', category: 'Display' },
  { label: 'Playfair Display', family: 'Playfair Display', category: 'Serif' },
  { label: 'Lora', family: 'Lora', category: 'Serif' },
  { label: 'Merriweather', family: 'Merriweather', category: 'Serif' },
  { label: 'Cormorant Garamond', family: 'Cormorant Garamond', category: 'Serif' },
  { label: 'EB Garamond', family: 'EB Garamond', category: 'Serif' },
  { label: 'Libre Baskerville', family: 'Libre Baskerville', category: 'Serif' },
  { label: 'PT Serif', family: 'PT Serif', category: 'Serif' },
  { label: 'DM Serif Display', family: 'DM Serif Display', category: 'Serif' },
  { label: 'Crimson Text', family: 'Crimson Text', category: 'Serif' },
  { label: 'Dancing Script', family: 'Dancing Script', category: 'Script' },
  { label: 'Pacifico', family: 'Pacifico', category: 'Script' },
  { label: 'Great Vibes', family: 'Great Vibes', category: 'Script' },
  { label: 'Sacramento', family: 'Sacramento', category: 'Script' },
  { label: 'Caveat', family: 'Caveat', category: 'Script' },
  { label: 'Satisfy', family: 'Satisfy', category: 'Script' },
];

// Single Google Fonts URL loading all the families above (weights 400/700).
export const GOOGLE_FONTS_HREF =
  'https://fonts.googleapis.com/css2?' +
  FONTS.map((f) => `family=${f.family.replace(/ /g, '+')}:wght@400;700`).join('&') +
  '&display=swap';
