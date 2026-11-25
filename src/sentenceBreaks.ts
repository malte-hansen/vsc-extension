/** Half-open column range `[start, end)` within a line. */
export interface Gap {
  start: number;
  end: number;
}

// An ordered list marker such as "1." at the start of a line, optionally nested
// in block quotes or bullets.
const LIST_MARKER = /^\s*(?:[-*+>]\s+)*\d+\.$/;

// Abbreviations that are practically never the last word of a sentence.
const ABBREVIATION = /\b(?:[Ee]\.g|[Ii]\.e|[Cc]f|vs|Dr|Mr|Mrs|Ms|Prof)\.$/;

// The end of a sentence at the end of a line, optionally followed by closing
// quotes, brackets, or markup, and by footnote references.
const SENTENCE_END =
  /[.!?\u2026][)\]}"'\u201C\u201D\u2019\u00BB*_`~]*(?:\[\^[^\]]+\])*$/;

/** Whether a line, without trailing whitespace, ends with a sentence. */
export function endsSentence(line: string): boolean {
  return SENTENCE_END.test(line) && !ABBREVIATION.test(line);
}

/**
 * Finds the whitespace following each sentence in a line. A sentence ends with
 * a "." that is followed by whitespace, so "3.14" or "file.txt" do not match.
 * A gap that reaches the end of the line is trailing whitespace.
 */
export function findSentenceGaps(line: string): Gap[] {
  const gaps: Gap[] = [];
  for (const match of line.matchAll(/(?<=\.)[ \t]+/g)) {
    const before = line.slice(0, match.index);
    if (!LIST_MARKER.test(before) && !ABBREVIATION.test(before)) {
      gaps.push({ start: match.index, end: match.index + match[0].length });
    }
  }
  return gaps;
}
