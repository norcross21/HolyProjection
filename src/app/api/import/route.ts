import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { createClient } from '@supabase/supabase-js';

// Setup local Supabase client (using service role or anon key from env)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function POST(req: NextRequest) {
  try {
    const { text, userId } = await req.json() as { text: string; userId?: string };

    if (!text || !text.trim()) {
      return NextResponse.json({ error: 'Text content is required' }, { status: 400 });
    }

    const geminiApiKey = process.env.GEMINI_API_KEY;

    let parsedSongs: any[] = [];

    if (!geminiApiKey || geminiApiKey === 'your-gemini-key') {
      console.warn('GEMINI_API_KEY is missing! Using rule-based fallback parser.');
      // Rule-based fallback parser for demo purposes
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

      const jsonText = response.text || '[]';
      parsedSongs = JSON.parse(jsonText);
    }

    // Save parsed songs to Supabase
    const isSupabaseConfigured = supabaseUrl && supabaseAnonKey && supabaseUrl !== 'https://your-project-id.supabase.co';
    const importedList: any[] = [];

    if (!isSupabaseConfigured) {
      // Demo Mode: Return parsed songs directly for client-side storage
      return NextResponse.json({
        success: true,
        mode: 'demo',
        data: parsedSongs
      });
    }

    // Supabase Live Mode
    for (const song of parsedSongs) {
      // 1. Insert presentation
      const { data: presData, error: presErr } = await supabase
        .from('presentations')
        .insert({
          title: song.title,
          created_by: userId || null,
          settings: {
            fontSize: 48,
            background: '#0f172a',
            margin: 8,
            fontFamily: 'Inter'
          }
        })
        .select()
        .single();

      if (presErr) {
        console.error('Error inserting presentation:', presErr);
        continue;
      }

      // 2. Insert slides
      const slidesToInsert = song.slides.map((slide: any, index: number) => ({
        presentation_id: presData.id,
        order_index: index,
        type: 'text',
        content: slide.content,
        translation: slide.translation || null,
        settings: {}
      }));

      const { error: slideErr } = await supabase
        .from('slides')
        .insert(slidesToInsert);

      if (slideErr) {
        console.error('Error inserting slides:', slideErr);
      }

      importedList.push({
        id: presData.id,
        title: presData.title,
        slidesCount: slidesToInsert.length
      });
    }

    return NextResponse.json({
      success: true,
      mode: 'supabase',
      imported: importedList
    });

  } catch (err: any) {
    console.error('Error in import route:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

// Simple rule-based mock parser for offline/no-API key situations
function parseSongsMock(text: string): any[] {
  // Split text by double double newlines or common splitters
  const rawSections = text.split(/\n\s*\n\s*\n/);
  const songs: any[] = [];

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
    const slides: any[] = [];
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
