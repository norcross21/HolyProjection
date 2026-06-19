// Smart lyric / liturgy splitting.
//
// Worship lyrics are written as stanzas (verses, choruses, bridges) separated by
// blank lines. The goal is one stanza per slide, but a long stanza must break
// across several slides without orphaning a single line. This splits on blank
// lines first, then evenly chunks any stanza longer than `maxLinesPerSlide`.

export interface SplitOptions {
  maxLinesPerSlide?: number; // hard cap on lines shown on one slide
}

/**
 * Split a block of lyrics/liturgy into slide-sized chunks.
 * Returns an array of slide contents (each a multi-line string).
 */
export function splitLyricsIntoSlides(text: string, opts: SplitOptions = {}): string[] {
  const maxLines = Math.max(1, opts.maxLinesPerSlide ?? 4);
  const normalized = (text || '').replace(/\r\n/g, '\n').replace(/ /g, ' ').trim();
  if (!normalized) return [];

  // Stanzas are separated by one or more blank lines.
  const stanzas = normalized
    .split(/\n[ \t]*\n+/)
    .map((s) => s.split('\n').map((l) => l.trim()).filter(Boolean))
    .filter((lines) => lines.length > 0);

  const slides: string[] = [];
  for (const lines of stanzas) {
    if (lines.length <= maxLines) {
      slides.push(lines.join('\n'));
      continue;
    }
    // Break a long stanza into the fewest balanced chunks so we don't leave a
    // single dangling line (e.g. 6 lines @ max 4 → two slides of 3, not 4+2).
    const chunkCount = Math.ceil(lines.length / maxLines);
    const perChunk = Math.ceil(lines.length / chunkCount);
    for (let i = 0; i < lines.length; i += perChunk) {
      slides.push(lines.slice(i, i + perChunk).join('\n'));
    }
  }

  return slides.length ? slides : [normalized];
}

/**
 * Would this text actually split into more than one slide? Used to decide
 * whether to surface the "Split" affordance.
 */
export function wouldSplit(text: string, opts: SplitOptions = {}): boolean {
  return splitLyricsIntoSlides(text, opts).length > 1;
}
