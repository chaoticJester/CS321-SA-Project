// Thai has no spaces between words, so pdfkit's built-in line breaking
// splits words in the middle (e.g. "ต้องก / าร"). These helpers find real
// word boundaries with Intl.Segmenter and wrap lines ourselves.

const wordSegmenter = new Intl.Segmenter("th", { granularity: "word" });
const graphemeSegmenter = new Intl.Segmenter("th", { granularity: "grapheme" });

// Anything that can measure text at the current font/size (a PDFKit document).
export interface TextMeasurer {
  widthOfString(text: string): number;
}

function splitLongWord(measurer: TextMeasurer, word: string, maxWidth: number): string[] {
  const pieces: string[] = [];
  let current = "";
  for (const { segment } of graphemeSegmenter.segment(word)) {
    if (current && measurer.widthOfString(current + segment) > maxWidth) {
      pieces.push(current);
      current = segment;
    } else {
      current += segment;
    }
  }
  if (current) pieces.push(current);
  return pieces;
}

// Split text into lines that fit maxWidth, breaking only between words.
// Existing "\n" in the text are kept as hard line breaks.
export function wrapThaiText(measurer: TextMeasurer, text: string, maxWidth: number): string[] {
  const lines: string[] = [];

  for (const paragraph of text.split(/\r?\n/)) {
    let current = "";

    for (const { segment } of wordSegmenter.segment(paragraph)) {
      const candidate = current + segment;
      if (measurer.widthOfString(candidate) <= maxWidth) {
        current = candidate;
        continue;
      }

      if (current.trim()) lines.push(current.trimEnd());
      current = segment.trimStart();

      // A single word wider than the whole line: break it by character.
      if (measurer.widthOfString(current) > maxWidth) {
        const pieces = splitLongWord(measurer, current, maxWidth);
        lines.push(...pieces.slice(0, -1));
        current = pieces[pieces.length - 1] ?? "";
      }
    }

    lines.push(current.trimEnd());
  }

  return lines;
}
