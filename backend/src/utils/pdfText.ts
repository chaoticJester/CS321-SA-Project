import { wrapThaiText } from "./thaiText";

// The PR design uses two font families, like the team's LaTeX template:
// Thai text in Bai Jamjuree, English letters / numbers in Inter (scaled 0.95).
// pdfkit uses one font per text call, so we split each string into runs by
// script, measure/draw the runs one after another, and share one baseline.

type Doc = PDFKit.PDFDocument;
export type Align = "left" | "center" | "right";

// Registration names. They must differ from the fonts' internal PostScript
// names: the supplied Inter-SemiBold.ttf calls itself "Inter-Regular", and
// pdfkit caches fonts by that name, so reusing it would mix the two weights up.
export const FONT = {
  thai: "pr-thai",
  thaiBold: "pr-thai-bold",
  latin: "pr-latin",
  latinBold: "pr-latin-bold",
} as const;

const LATIN_SCALE = 0.95;
const THAI_CHAR = /[฀-๿]/;

export interface TextStyle {
  size: number;
  bold?: boolean;
  color?: string;
}

interface Run {
  text: string;
  thai: boolean;
}

// "จอภาพ 24 นิ้ว" -> [จอภาพ][ 24 ][นิ้ว]
function splitRuns(text: string): Run[] {
  const runs: Run[] = [];
  for (const char of text) {
    const thai = THAI_CHAR.test(char);
    const last = runs[runs.length - 1];
    if (last && last.thai === thai) last.text += char;
    else runs.push({ text: char, thai });
  }
  return runs;
}

function useRunFont(doc: Doc, run: Run, style: TextStyle): void {
  if (run.thai) {
    doc.font(style.bold ? FONT.thaiBold : FONT.thai).fontSize(style.size);
  } else {
    doc.font(style.bold ? FONT.latinBold : FONT.latin).fontSize(style.size * LATIN_SCALE);
  }
}

export function measureText(doc: Doc, text: string, style: TextStyle): number {
  let width = 0;
  for (const run of splitRuns(text)) {
    useRunFont(doc, run, style);
    width += doc.widthOfString(run.text);
  }
  return width;
}

// Height of one line of text (based on the Thai font, which is the taller one).
export function lineHeight(doc: Doc, style: TextStyle): number {
  doc.font(style.bold ? FONT.thaiBold : FONT.thai).fontSize(style.size);
  return doc.currentLineHeight(true);
}

// Distance from the top of a line to its baseline.
function baselineOffset(doc: Doc, style: TextStyle): number {
  doc.font(style.bold ? FONT.thaiBold : FONT.thai).fontSize(style.size);
  const font = (doc as unknown as { _font: { ascender: number } })._font;
  return (font.ascender / 1000) * style.size;
}

// Draw a single line (no wrapping) with its top-left box at (x, y).
// `width` is only needed for center / right alignment.
export function drawLine(
  doc: Doc,
  text: string,
  x: number,
  y: number,
  style: TextStyle,
  options: { width?: number; align?: Align } = {},
): void {
  const align = options.align ?? "left";
  if (align !== "left" && options.width !== undefined) {
    const free = options.width - measureText(doc, text, style);
    x += align === "right" ? free : free / 2;
  }

  const baseline = y + baselineOffset(doc, style);
  doc.fillColor(style.color ?? "black");
  for (const run of splitRuns(text)) {
    useRunFont(doc, run, style);
    doc.text(run.text, x, baseline, { lineBreak: false, baseline: "alphabetic" });
    x += doc.widthOfString(run.text);
  }
}

// Break text into lines that fit `width` (Thai-aware word breaking).
export function wrapText(doc: Doc, text: string, width: number, style: TextStyle): string[] {
  return wrapThaiText({ widthOfString: (s) => measureText(doc, s, style) }, text, width);
}

// Draw wrapped text starting at (x, y). Returns the y below the last line.
export function drawParagraph(
  doc: Doc,
  text: string,
  x: number,
  y: number,
  width: number,
  style: TextStyle,
  options: { align?: Align; lineGap?: number } = {},
): number {
  const lh = lineHeight(doc, style) + (options.lineGap ?? 0);
  const lines = wrapText(doc, text, width, style);
  lines.forEach((line, i) => drawLine(doc, line, x, y + i * lh, style, { width, align: options.align }));
  return y + lines.length * lh;
}

// "Label: value" where only the label is bold, wrapping the value under itself
// when it is long. Returns the y below the block.
export function drawLabelValue(
  doc: Doc,
  label: string,
  value: string,
  x: number,
  y: number,
  width: number,
  style: TextStyle,
  valueColor?: string,
): number {
  const labelText = `${label}: `;
  const labelStyle = { ...style, bold: true };
  const labelWidth = measureText(doc, labelText, labelStyle);
  drawLine(doc, labelText, x, y, labelStyle);
  return drawParagraph(doc, value, x + labelWidth, y, width - labelWidth, {
    ...style,
    color: valueColor ?? style.color,
  });
}
