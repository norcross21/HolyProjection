import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'Internal Server Error';
}

export async function POST(req: NextRequest) {
  try {
    const body: unknown = await req.json();
    const text = isRecord(body) && typeof body.text === 'string' ? body.text : '';
    const targetLang = isRecord(body) && typeof body.targetLang === 'string' ? body.targetLang : undefined;

    if (!text || !text.trim()) {
      return NextResponse.json({ error: 'Text content is required' }, { status: 400 });
    }

    const geminiApiKey = process.env.GEMINI_API_KEY;
    const target = targetLang || 'Arabic';

    if (!geminiApiKey || geminiApiKey === 'your-gemini-key') {
      console.warn('GEMINI_API_KEY is missing! Using rule-based fallback translator.');
      // Rule-based fallback translator for demo/offline mode
      const mockTranslation = translateMock(text, target);
      return NextResponse.json({
        success: true,
        mode: 'demo',
        translation: mockTranslation
      });
    }

    // Initialize Google Gen AI client
    const ai = new GoogleGenAI({ apiKey: geminiApiKey });
    const prompt = `
You are an expert worship liturgy translator. Translate the following lyrics text into ${target}. 

Rules:
1. Translate line by line. Maintain the exact line count and formatting.
2. Ensure the translation captures the spiritual meaning (do not translate too literally).
3. Do not add any conversational text, notes, warnings, or formatting tags. Output ONLY the translated text itself.

Lyrics to translate:
${text}
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    const translatedText = response.text || '';

    return NextResponse.json({
      success: true,
      mode: 'supabase',
      translation: translatedText.trim()
    });

  } catch (err: unknown) {
    console.error('Error in translate API:', err);
    return NextResponse.json({ error: errorMessage(err) }, { status: 500 });
  }
}

// Simple rule-based mock translator for offline/no-API key situations
function translateMock(text: string, target: string): string {
  void target;

  // Simple word mappings for typical worship lyrics to give a semi-realistic feel
  const dictionary: { [key: string]: string } = {
    'amazing': 'مدهشة',
    'grace': 'نعمة',
    'sweet': 'حلو',
    'sound': 'صوت',
    'wretch': 'بائس',
    'lost': 'ضال',
    'found': 'موجود',
    'blind': 'أعمى',
    'see': 'أبصر',
    'worship': 'عبادة',
    'lord': 'الرب',
    'god': 'الله',
    'love': 'محبة',
    'peace': 'سلام',
    'praise': 'تسبيح',
    'holy': 'قدوس',
    'jesus': 'يسوع',
    'heart': 'قلب',
    'spirit': 'روح',
    'sing': 'رنم',
    'song': 'ترنيمة'
  };

  const lines = text.split('\n');
  const translatedLines = lines.map(line => {
    // Basic word-by-word substitution if possible, otherwise generic translated placeholder
    const words = line.toLowerCase().replace(/[^a-zA-Z\s]/g, '').split(/\s+/);
    const matches = words.map(w => dictionary[w]).filter(Boolean);
    if (matches.length > 0) {
      return `[ترجمة تجريبية: ${matches.join(' ')}]`;
    }
    return '[الترجمة التجريبية لهذا السطر الكنسي...]';
  });

  return translatedLines.join('\n');
}
