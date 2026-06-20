import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

// Large books make many Gemini calls — allow the function the full window.
export const maxDuration = 300;

interface ParsedSlide {
  type?: string;
  content: string;
  translation?: string | null;
}

interface ParsedSong {
  title: string;
  slides: ParsedSlide[];
}

type UnknownRecord = Record<string, unknown>;
type SlideRecord = UnknownRecord & { content: string };

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null;
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'Internal Server Error';
}

// Lines that are copyright / licensing / publisher / contact boilerplate rather
// than lyrics — stripped from every slide so they never land on the screen.
const BOILERPLATE = /(all rights reserved|ccli|©|\(c\)\s*\d|copyright|used by permission|words?\s*(&|and)\s*music|administ|publish|reproduced|retrieval system|photocopying|license\s*#|www\.|https?:|\.com\b|\.church\b|\.org\b|\bp\.?o\.?\s*box\b|\b\d{3}[-.\s]\d{3}[-.\s]\d{4}\b|\b[A-Z]{2}\s+\d{5}\b|\bblvd\b|\bavenue\b|\bsuite\b)/i;

function cleanSlideContent(content: string): string {
  return content
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !BOILERPLATE.test(l) && !/^\d+$/.test(l))
    .join('\n')
    .trim();
}

function normalizeSongs(input: unknown): ParsedSong[] {
  if (!Array.isArray(input)) return [];

  return input
    .map((song, i) => {
      const songRecord = isRecord(song) ? song : {};
      const rawSlides = songRecord.slides;
      const slides = (Array.isArray(rawSlides) ? rawSlides : [])
        .filter((slide): slide is SlideRecord => isRecord(slide) && typeof slide.content === 'string')
        .map((slide) => ({
          type: typeof slide.type === 'string' && slide.type.trim() ? slide.type : 'Verse',
          content: cleanSlideContent(slide.content),
          translation: typeof slide.translation === 'string' && slide.translation.trim() ? slide.translation : null,
        }))
        .filter((s) => s.content.length > 0); // drop slides that were pure boilerplate
      return {
        title: typeof songRecord.title === 'string' && songRecord.title.trim() ? songRecord.title.trim() : `Imported Song #${i + 1}`,
        slides,
      };
    })
    .filter((song) => song.slides.length > 0); // drop empty songs
}

// Split a big paste into chunks small enough that Gemini reliably returns
// complete JSON. We break on blank lines (song/section boundaries) and pack
// paragraphs up to a character budget so individual songs stay intact.
function chunkText(text: string, maxChars = 4500): string[] {
  const paragraphs = text.replace(/\r\n/g, '\n').split(/\n[ \t]*\n/);

  // Guarantee no single piece exceeds the budget — a songbook pasted from a PDF
  // often has NO blank lines, so a "paragraph" can be the whole book. Break any
  // oversized paragraph at line boundaries.
  const pieces: string[] = [];
  for (const p of paragraphs) {
    if (p.length <= maxChars) { pieces.push(p); continue; }
    let buf = '';
    for (const line of p.split('\n')) {
      if (buf && buf.length + line.length + 1 > maxChars) { pieces.push(buf); buf = ''; }
      buf += (buf ? '\n' : '') + line;
    }
    if (buf) pieces.push(buf);
  }

  // Pack the (now bounded) pieces back up to the budget.
  const chunks: string[] = [];
  let buf = '';
  for (const piece of pieces) {
    if (buf && buf.length + piece.length + 2 > maxChars) { chunks.push(buf); buf = ''; }
    buf += (buf ? '\n\n' : '') + piece;
  }
  if (buf.trim()) chunks.push(buf);
  return chunks;
}

const PROMPT_RULES = `You are an expert worship-song parser. The input is raw text from a songbook/bulletin that may contain MANY songs.

Return a JSON array of songs. For each song:
- "title": the song's title (a short heading, often in CAPS or above the lyrics). If a number precedes it, drop the number.
- "slides": the lyrics broken into slides.

Rules:
1. SEPARATE every distinct song into its own object. A new song usually starts at a title line after a blank gap.
2. Break each song into slides by section (Verse 1, Chorus, Verse 2, Bridge, Tag, Ending). Put the section name in "type". If a section is longer than 4 lines, split it across multiple slides.
3. EXCLUDE all non-lyric text: copyright lines, ©, "All Rights Reserved", CCLI numbers/licenses, "Used by Permission", publisher/administration lines, author credits ("Words and music by…"), church names, addresses, phone numbers, websites, and standalone page numbers. Do NOT create slides for these.
4. Only set "translation" if the source genuinely contains a second language for that section (e.g. Arabic/Farsi lines beside the English). If there is no real translation, set it to null. NEVER invent or transliterate a translation.
5. "content" holds the primary (usually English) lyrics only.`;

async function parseChunk(ai: GoogleGenAI, chunk: string): Promise<ParsedSong[]> {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `${PROMPT_RULES}\n\nSONGBOOK TEXT:\n${chunk}`,
      config: {
        responseMimeType: 'application/json',
        maxOutputTokens: 16384,
        responseSchema: {
          type: 'ARRAY',
          items: {
            type: 'OBJECT',
            properties: {
              title: { type: 'STRING' },
              slides: {
                type: 'ARRAY',
                items: {
                  type: 'OBJECT',
                  properties: {
                    type: { type: 'STRING' },
                    content: { type: 'STRING' },
                    translation: { type: 'STRING' },
                  },
                  required: ['type', 'content'],
                },
              },
            },
            required: ['title', 'slides'],
          },
        },
      },
    });
    const jsonText = (response.text || '[]').trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
    return normalizeSongs(JSON.parse(jsonText));
  } catch (err) {
    console.warn('Import chunk failed, skipping:', errorMessage(err));
    return [];
  }
}

// Run async tasks with bounded concurrency (keeps us under Gemini rate limits).
async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i]);
    }
  });
  await Promise.all(workers);
  return out;
}

export async function POST(req: NextRequest) {
  try {
    const body: unknown = await req.json();
    const text = isRecord(body) && typeof body.text === 'string' ? body.text : '';

    if (!text || !text.trim()) {
      return NextResponse.json({ error: 'Text content is required' }, { status: 400 });
    }

    const geminiApiKey = process.env.GEMINI_API_KEY;

    if (!geminiApiKey || geminiApiKey === 'your-gemini-key') {
      console.warn('GEMINI_API_KEY is missing! Using rule-based fallback parser.');
      return NextResponse.json({ success: true, mode: 'demo', data: normalizeSongs(parseSongsMock(text)) });
    }

    const ai = new GoogleGenAI({ apiKey: geminiApiKey });
    const chunks = chunkText(text).slice(0, 200); // safety cap on very large books
    const perChunk = await mapLimit(chunks, 5, (c) => parseChunk(ai, c));
    let songs = perChunk.flat();

    // Merge consecutive fragments that share a title (a song split across a chunk boundary).
    const merged: ParsedSong[] = [];
    for (const song of songs) {
      const prev = merged[merged.length - 1];
      if (prev && prev.title.toLowerCase() === song.title.toLowerCase()) {
        prev.slides.push(...song.slides);
      } else {
        merged.push(song);
      }
    }
    songs = merged;

    // If every chunk failed (e.g. transient outage), fall back to the rule parser
    // so the user still gets *something* rather than an empty result.
    if (songs.length === 0) {
      return NextResponse.json({ success: true, mode: 'fallback', data: normalizeSongs(parseSongsMock(text)) });
    }

    return NextResponse.json({ success: true, mode: 'ai', data: songs });
  } catch (err: unknown) {
    console.error('Error in import route:', errorMessage(err));
    return NextResponse.json({ error: errorMessage(err) }, { status: 500 });
  }
}

// Rule-based fallback parser for offline / no-API-key situations. Splits on blank
// gaps, uses the first line as a title, groups ~4 lines per slide, strips
// boilerplate, and does NOT invent translations.
function parseSongsMock(text: string): ParsedSong[] {
  const rawSections = text.replace(/\r\n/g, '\n').split(/\n\s*\n\s*\n/);
  const songs: ParsedSong[] = [];

  rawSections.forEach((section, songIdx) => {
    const lines = section.split('\n').map((l) => l.trim()).filter((l) => l.length > 0 && !BOILERPLATE.test(l) && !/^\d+$/.test(l));
    if (lines.length === 0) return;

    let title = lines[0];
    let contentLines = lines.slice(1);
    if (title.toLowerCase().startsWith('title:')) {
      title = title.substring(6).trim();
    } else if (title.length > 60) {
      title = `Imported Song #${songIdx + 1}`;
      contentLines = lines;
    }

    const slides: ParsedSlide[] = [];
    let current: string[] = [];
    let idx = 1;
    const flush = () => {
      if (current.length) { slides.push({ type: `Verse ${idx++}`, content: current.join('\n'), translation: null }); current = []; }
    };
    contentLines.forEach((line) => { current.push(line); if (current.length >= 4) flush(); });
    flush();

    if (slides.length) songs.push({ title: title || `Imported Song #${songIdx + 1}`, slides });
  });

  return songs;
}
