// Supported translation target languages for the AI translator.
// `name` is sent verbatim to Gemini as the target language and stored in
// presentation settings. `rtl: true` marks right-to-left scripts so the UI can
// set text direction correctly.

export interface Language {
  name: string;
  rtl?: boolean;
}

// Common worship-friendly languages first, then a broad long tail.
export const LANGUAGES: Language[] = [
  // --- Common set ---
  { name: 'Arabic', rtl: true },
  { name: 'Persian (Farsi)', rtl: true },
  { name: 'Spanish' },
  { name: 'French' },
  { name: 'Portuguese' },
  { name: 'Mandarin Chinese' },
  { name: 'Hindi' },
  { name: 'Urdu', rtl: true },
  { name: 'Russian' },
  { name: 'Korean' },
  { name: 'Tagalog' },
  { name: 'Swahili' },
  // --- Extended ---
  { name: 'German' },
  { name: 'Italian' },
  { name: 'Dutch' },
  { name: 'Polish' },
  { name: 'Romanian' },
  { name: 'Greek' },
  { name: 'Turkish' },
  { name: 'Hebrew', rtl: true },
  { name: 'Pashto', rtl: true },
  { name: 'Kurdish (Sorani)', rtl: true },
  { name: 'Dari', rtl: true },
  { name: 'Japanese' },
  { name: 'Cantonese' },
  { name: 'Vietnamese' },
  { name: 'Thai' },
  { name: 'Indonesian' },
  { name: 'Malay' },
  { name: 'Bengali' },
  { name: 'Punjabi' },
  { name: 'Tamil' },
  { name: 'Telugu' },
  { name: 'Gujarati' },
  { name: 'Marathi' },
  { name: 'Malayalam' },
  { name: 'Nepali' },
  { name: 'Sinhala' },
  { name: 'Burmese' },
  { name: 'Khmer' },
  { name: 'Lao' },
  { name: 'Mongolian' },
  { name: 'Amharic' },
  { name: 'Tigrinya' },
  { name: 'Yoruba' },
  { name: 'Igbo' },
  { name: 'Hausa' },
  { name: 'Somali' },
  { name: 'Zulu' },
  { name: 'Xhosa' },
  { name: 'Afrikaans' },
  { name: 'Ukrainian' },
  { name: 'Czech' },
  { name: 'Slovak' },
  { name: 'Hungarian' },
  { name: 'Bulgarian' },
  { name: 'Serbian' },
  { name: 'Croatian' },
  { name: 'Albanian' },
  { name: 'Swedish' },
  { name: 'Norwegian' },
  { name: 'Danish' },
  { name: 'Finnish' },
  { name: 'Haitian Creole' },
  { name: 'Samoan' },
  { name: 'Tongan' },
  { name: 'Fijian' },
  { name: 'Maori' },
];

const RTL_NAMES = new Set(LANGUAGES.filter((l) => l.rtl).map((l) => l.name));

/** Whether a language name (as stored in settings) is right-to-left. */
export function isRTL(name?: string | null): boolean {
  return name ? RTL_NAMES.has(name) : false;
}

/** The direction attribute value for a given language. */
export function dirFor(name?: string | null): 'rtl' | 'ltr' {
  return isRTL(name) ? 'rtl' : 'ltr';
}

export const DEFAULT_TRANSLATION_LANG = 'Arabic';
