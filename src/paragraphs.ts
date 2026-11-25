import { closesFence, FENCE, findTableLines } from "./markdownTables";

interface Line {
  /** Nesting depth of block quotes. */
  depth: number;
  /** Column at which the text starts, after quote markers and indentation. */
  start: number;
  /** Whether the line is paragraph text, rather than blank, code, etc. */
  isText: boolean;
  /** Whether the line starts a new block, such as a list item. */
  startsBlock: boolean;
}

const LIST_MARKER = /^(?:[-*+•]|\d{1,9}[.)])(?:[ \t]+|$)/;
const THEMATIC_BREAK = /^([-*_])(?:[ \t]*\1){2,}\s*$/;
// Headings (and underlines of such), table rows, math in a single line, ":::"
// containers, alerts such as "[!NOTE]", and link definitions.
const OTHER_BLOCK =
  /^(?:#{1,6}(?:\s|$)|=+\s*$|-{2,}\s*$|\||\$\$.*\$\$\s*$|:::|\[!\w+\]|\[(?!\^)[^\]]+\]:\s*(?:\S+\s*(?:["'(].*)?)?$)/;
// Footnotes and definitions, which consist of text.
const TEXT_BLOCK = /^(?:\[\^[^\]]+\]:|:\s)/;
const MATH = /^\$\$(?!.*\$\$)/;
// HTML that ends at a specific string, rather than at a blank line.
const HTML_UNTIL: [start: RegExp, end: RegExp][] = [
  [/^<!--/, /-->/],
  [/^<(?:pre|script|style|textarea)\b/i, /<\/(?:pre|script|style|textarea)>/i],
];
const HTML = /^<\/?[a-z][a-z0-9-]*(?:[\s/>]|$)/i;
// A line consisting of a single, possibly unfinished tag, even an inline one.
const HTML_TAG = /^<[^>]*(?:>\s*)?$/;
const INLINE_HTML =
  /^<\/?(?:a|abbr|b|br|cite|code|del|em|i|img|ins|kbd|mark|q|s|small|span|strong|sub|sup|u|var)\b/i;

// The end of a line that has to stay a line break.
const HARD_BREAK = /(?: {2}|\\|<br\s*\/?>\s*)$/i;

/** Whether a line is a heading starting with "#", which takes up one line. */
export function isHeading(line: string): boolean {
  return /^[ \t>]*#{1,6}[ \t]/.test(line);
}

/**
 * Finds the lines that continue the paragraph of the preceding line, and the
 * columns at which their text starts. Lines are only reported if joining them
 * with the preceding line surely keeps the structure of a Markdown document.
 */
export function findContinuations(lines: string[]): Map<number, number> {
  const tableLines = findTableLines(lines);
  const continuations = new Map<number, number>();
  let previous: Line | undefined;
  for (const [i, line] of analyzeLines(lines).entries()) {
    if (
      previous?.isText &&
      line.isText &&
      !line.startsBlock &&
      line.depth === previous.depth &&
      !tableLines.has(i - 1) &&
      !tableLines.has(i) &&
      !HARD_BREAK.test(lines[i - 1] ?? "")
    ) {
      continuations.set(i, line.start);
    }
    previous = line;
  }
  return continuations;
}

function analyzeLines(lines: string[]): Line[] {
  const result: Line[] = [];
  // The block quote depth of an open block, and the function finding its end.
  let open: { depth: number; isEnd: (text: string) => boolean } | undefined;
  // Columns at which the contents of the current, nested list items start.
  let lists: number[] = [];
  let previous: Line | undefined;

  const frontMatterEnd = findFrontMatterEnd(lines);
  for (const [i, text] of lines.entries()) {
    const line = analyzeLine(text, i);
    result.push(line);
    previous = line;
  }
  return result;

  function analyzeLine(text: string, i: number): Line {
    const line = { depth: 0, start: 0, isText: false, startsBlock: false };
    if (i <= frontMatterEnd) {
      return line;
    }

    const indented = indentation(text) - (lists.at(-1) ?? 0) >= 4;
    if (!open && indented && !previous?.isText && text.trim() !== "") {
      while (lists.length > 0 && indentation(text) < (lists.at(-1) ?? 0)) {
        lists.pop();
      }
      return line; // Indented code
    }

    [line.depth, line.start] = skipQuoteMarkers(text, open?.depth);
    const content = text.slice(line.start);
    if (open && line.depth >= open.depth) {
      if (open.isEnd(content)) {
        open = undefined;
      }
      return line;
    }
    open = undefined;

    const continuesText = previous?.isText && previous.depth === line.depth;
    if (previous && previous.depth !== line.depth) {
      lists = [];
    }
    if (content.trim() === "") {
      return line;
    }

    let indent = indentation(content);
    line.start += content.length - content.trimStart().length;
    if (!continuesText || LIST_MARKER.test(content.trimStart())) {
      lists = lists.filter((column) => column <= indent);
      if (!continuesText && indent - (lists.at(-1) ?? 0) >= 4) {
        return line; // Indented code
      }
    }

    let rest = content.trim();
    while (!THEMATIC_BREAK.test(rest)) {
      const marker = LIST_MARKER.exec(rest)?.[0];
      if (marker === undefined) {
        break;
      }
      line.startsBlock = true;
      rest = rest.slice(marker.length);
      const spaces = marker.length - marker.trimEnd().length;
      const isCode = spaces > 4;
      indent += isCode ? marker.trimEnd().length + 1 : marker.length;
      lists.push(indent);
      if (isCode) {
        return line;
      }
    }

    const { depth } = line;
    const fence = FENCE.exec(rest)?.[1];
    if (fence !== undefined) {
      open = { depth, isEnd: (end) => closesFence(end, fence) };
      return line;
    }
    if (MATH.test(rest)) {
      open = { depth, isEnd: (end) => end.includes("$$") };
      return line;
    }
    const htmlEnd = HTML_UNTIL.find(([start]) => start.test(rest))?.[1];
    if (htmlEnd) {
      if (!htmlEnd.test(rest)) {
        open = { depth, isEnd: (end) => htmlEnd.test(end) };
      }
      return line;
    }
    const startsHtml =
      !INLINE_HTML.test(rest) ||
      (HTML_TAG.test(rest) && (!continuesText || line.startsBlock));
    if (HTML.test(rest) && startsHtml) {
      open = { depth, isEnd: (end) => end.trim() === "" };
      return line;
    }

    line.startsBlock ||= TEXT_BLOCK.test(rest);
    line.isText =
      rest !== "" && !THEMATIC_BREAK.test(rest) && !OTHER_BLOCK.test(rest);
    return line;
  }
}

/** Returns the index of the last line of the front matter, or -1. */
function findFrontMatterEnd(lines: string[]): number {
  return lines[0] === "---" ? lines.indexOf("---", 1) : -1;
}

function indentation(text: string): number {
  const whitespace = /^[ \t]*/.exec(text)?.[0] ?? "";
  let width = 0;
  for (const character of whitespace) {
    width += character === "\t" ? 4 - (width % 4) : 1;
  }
  return width;
}

/** Returns the depth of block quotes and the column after their markers. */
function skipQuoteMarkers(
  text: string,
  maxDepth = Number.POSITIVE_INFINITY,
): [depth: number, start: number] {
  let depth = 0;
  let start = 0;
  while (depth < maxDepth) {
    const marker = /^[ \t]*>[ \t]?/.exec(text.slice(start))?.[0];
    if (marker === undefined) {
      break;
    }
    depth++;
    start += marker.length;
  }
  return [depth, start];
}
