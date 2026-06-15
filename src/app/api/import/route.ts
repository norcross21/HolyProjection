import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

interface ParsedSlide {
  type?: string;
  content: string;
  translation?: string | null;
}

interface ParsedSong {
  title: string;
  slides: ParsedSlide[];
}

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json() as { text: string };

    if (!text || !text.trim()) {
      return NextResponse.json({ error: 'Text content is required' }, { status: 400 });
    }

    const geminiApiKey = process.env.GEMINI_API_KEY;
    let parsedSongs: ParsedSong[] = [];

    if (!geminiApiKey || geminiApiKey === 'your-gemini-key') {
      console.warn('GEMINI_API_KEY is missing! Using rule-based fallback parser.');
      parsedSongs = parseSongsMock(text);
    } else {
      // Call Gemini 2.5 Flash
      const ai = new GoogleGenAI({ apiKey: geminiApiKey });
      const prompt = `
You are an expert worship liturgy assistant. Parse the following messy bulk document of songs.
Identify each song, separate it into individual songs, and break each song down into logical slides (Verse 1, Chorus, Verse 2, Bridge, etc.).

Rules:
1. Split long sections into separate slides if they exceed 4-5 lines of text.
2. If the text is bilingual (e.g. English lines followed by Arabic lines, or English verse followed by Arabic verse), separate them. Put the primary language (English) in 'content', and the secondary language (Arabic/Farsi) in 'translation'.
3. If there is no translation, leave 'translation' empty or null.
4. Return a structured JSON array matching the schema.

Messy Songs Text:
${text}
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'ARRAY',
            description: 'List of parsed songs',
            items: {
              type: 'OBJECT',
              properties: {
                title: { type: 'STRING', description: 'Title of the song' },
                slides: {
                  type: 'ARRAY',
                  description: 'Slides for the song',
                  items: {
                    type: 'OBJECT',
                    properties: {
                      type: { type: 'STRING', description: 'Type of slide, e.g. Verse 1, Chorus, Bridge' },
                      content: { type: 'STRING', description: 'Primary English lyrics' },
                      translation: { type: 'STRING', description: 'Translation of lyrics if available, otherwise blank' }
                    },
                    required: ['type', 'content']
                  }
                }
              },
              required: ['title', 'slides']
            }
          }
        }
      });

      // The model usually returns clean JSON, but guard against fences / truncation.
      const jsonText = (response.text || '[]')
        .trim()
        .replace(/^```(?:json)?/i, '')
        .replace(/```$/, '')
        .trim();

      try {
        parsedSongs = JSON.parse(jsonText);
      } catch {
        console.warn('Gemini returned non-JSON output; falling back to rule-based parser.');
        parsedSongs = parseSongsMock(text);
      }
    }

    // Normalize so the client can rely on the shape (slides is always an array).
    const normalized: ParsedSong[] = (Array.isArray(parsedSongs) ? parsedSongs : []).map((song: any, i) => ({
      title: (song?.title || `Imported Song #${i + 1}`).toString(),
      slides: Array.isArray(song?.slides)
        ? song.slides
            .filter((s: any) => s && typeof s.content === 'string')
            .map((s: any) => ({
              type: s.type || 'Verse',
              content: s.content,
              translation: s.translation || null,
            }))
        : [],
    }));

    // Parsing only — the authenticated browser client performs the inserts so
    // they run under the user's session and satisfy row-level security.
    return NextResponse.json({ success: true, data: normalized });
  } catch (err: any) {
    console.error('Error in import route:', err?.message || err);
    return NextResponse.json({ error: err?.message || 'Internal Server Error' }, { status: 500 });
  }
}

// Simple rule-based mock parser for offline/no-API key situations
function parseSongsMock(text: string): ParsedSong[] {
  // Split text by triple newlines or common splitters
  const rawSections = text.split(/\n\s*\n\s*\n/);
  const songs: ParsedSong[] = [];

  rawSections.forEach((section, songIdx) => {
    const lines = section.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length === 0) return;

    // Use first line as title, or a default
    let title = lines[0];
    let contentLines = lines.slice(1);

    if (title.toLowerCase().startsWith('title:')) {
      title = title.substring(6).trim();
    } else if (title.length > 50) {
      title = `Imported Song #${songIdx + 1}`;
      contentLines = lines;
    }

    // Split content lines into slide groups (group every 4 lines)
    const slides: ParsedSlide[] = [];
    let currentSlideText: string[] = [];
    let slideIdx = 1;

    contentLines.forEach((line) => {
      currentSlideText.push(line);
      if (currentSlideText.length >= 4) {
        slides.push({
          type: `Verse ${slideIdx++}`,
          content: currentSlideText.join('\n'),
          translation: 'الترجمة التجريبية لهذا المقطع...'
        });
        currentSlideText = [];
      }
    });

    if (currentSlideText.length > 0) {
      slides.push({
        type: `Verse ${slideIdx}`,
        content: currentSlideText.join('\n'),
        translation: 'الترجمة التجريبية لهذا المقطع...'
      });
    }

    songs.push({
      title: title || `Imported Song #${songIdx + 1}`,
      slides: slides.length > 0 ? slides : [{
        type: 'Verse 1',
        content: 'No lyrics parsed.',
        translation: 'لا توجد كلمات.'
      }]
    });
  });

  return songs;
}
