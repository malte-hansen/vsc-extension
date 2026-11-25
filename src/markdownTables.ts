/** A table found in a Markdown document. */
export interface Table {
  /** Index of the header row. */
  firstLine: number;
  /** The cells of each row, one row per line of the table. */
  rows: string[][];
  indent: string;
}

export const FENCE = /^\s*(`{3,}(?=[^`]*$)|~{3,})/;
const LIST_ITEM = /^\s*(?:[-*+]|\d{1,9}[.)])(?:\s|$)/;
const BLOCK_QUOTE = /^\s*>(?: ?>)* ?/;
const DELIMITER_CELL = /^:?-+:?$/;
// Starts of block quotes, headings, and list items, which end a table.
const OTHER_BLOCK = /^\s*(?:>|#{1,6}\s|(?:[-*+]|\d{1,9}[.)])\s)/;

const graphemes = new Intl.Segmenter(undefined, { granularity: "grapheme" });
// Characters that take up two columns in a monospace font.
const WIDE =
  /\p{Emoji_Presentation}|\uFE0F|[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}\u3000-\u303E\uFF01-\uFF60\uFFE0-\uFFE6]/u;

/** Finds all tables outside of code blocks and block quotes. */
export function findTables(lines: string[]): Table[] {
  const tables: Table[] = [];
  let fence: string | undefined;
  let inList = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    if (fence !== undefined) {
      if (closesFence(line, fence)) {
        fence = undefined;
      }
      continue;
    }
    if (line.trim() === "") {
      continue;
    }

    if (LIST_ITEM.test(line)) {
      inList = true;
    } else if (!/^\s/.test(line)) {
      inList = false;
    }
    if (!inList && /^(?: {4}| {0,3}\t)/.test(line)) {
      continue; // Indented code block
    }

    fence = FENCE.exec(line)?.[1];
    if (fence !== undefined) {
      continue;
    }

    const rows = parseTable(lines, i);
    if (rows) {
      const indent = /^\s*/.exec(line)?.[0] ?? "";
      tables.push({ firstLine: i, rows, indent });
      i += rows.length - 1;
    }
  }
  return tables;
}

/** Finds the indices of all lines in tables, including those in block quotes. */
export function findTableLines(lines: string[]): Set<number> {
  const quoted = lines.map((line) => {
    const prefix = BLOCK_QUOTE.exec(line)?.[0];
    return prefix === undefined ? "" : line.slice(prefix.length);
  });
  return new Set(
    [...findTables(lines), ...findTables(quoted)].flatMap(
      ({ firstLine, rows }) => rows.map((_, i) => firstLine + i),
    ),
  );
}

export function closesFence(line: string, fence: string): boolean {
  const text = line.trim();
  return (
    text.length >= fence.length && text === fence.charAt(0).repeat(text.length)
  );
}

/**
 * Parses the table whose header is at the given line. A table needs a delimiter
 * row with as many cells as the header.
 */
function parseTable(lines: string[], start: number): string[][] | undefined {
  const header = parseRow(lines[start]);
  const delimiter = parseRow(lines[start + 1]);
  if (
    !header ||
    !delimiter ||
    header.length === 0 ||
    header.length !== delimiter.length ||
    !delimiter.every((cell) => DELIMITER_CELL.test(cell))
  ) {
    return undefined;
  }

  const rows = [header, delimiter];
  for (;;) {
    const row = parseRow(lines[start + rows.length]);
    if (!row) {
      return rows;
    }
    rows.push(row);
  }
}

/** Splits a row into trimmed cells. Returns undefined if it is not a row. */
function parseRow(line: string | undefined): string[] | undefined {
  if (line === undefined || OTHER_BLOCK.test(line) || FENCE.test(line)) {
    return undefined;
  }
  // As in GitHub Flavored Markdown, every "|" without a backslash separates
  // cells, even in inline code.
  const cells = [""];
  for (const [token] of line.matchAll(/\\.|./gsu)) {
    if (token === "|") {
      cells.push("");
    } else {
      cells[cells.length - 1] += token;
    }
  }
  if (cells.length === 1) {
    return undefined;
  }

  const trimmed = cells.map((cell) => cell.replace(/^[ \t]+|[ \t]+$/g, ""));
  // Nothing precedes a leading separator or follows a trailing one.
  if (trimmed[0] === "") {
    trimmed.shift();
  }
  if (trimmed.at(-1) === "") {
    trimmed.pop();
  }
  return trimmed;
}

/** Returns the formatted lines of a table. */
export function formatTable({ rows, indent }: Table): string[] {
  const [header = []] = rows;
  // Rows may have fewer cells than the header, or more, which are not rendered
  // but still kept.
  const columns = Math.max(...rows.map((row) => row.length));
  const widths = Array.from({ length: columns }, (_, column) =>
    Math.max(
      3,
      ...rows.map((row, i) => (i === 1 ? 0 : displayWidth(row[column] ?? ""))),
    ),
  );

  return rows.map((row, i) => {
    const cells = Array.from(
      { length: Math.max(header.length, row.length) },
      (_, column) => {
        const cell = row[column] ?? "";
        const width = widths[column] ?? 0;
        return i === 1
          ? formatDelimiter(cell, width)
          : cell + " ".repeat(width - displayWidth(cell));
      },
    );
    return `${indent}| ${cells.join(" | ")} |`;
  });
}

/** Keeps the colons, as they determine the alignment of the rendered table. */
function formatDelimiter(cell: string, width: number): string {
  const left = cell.startsWith(":") ? ":" : "";
  const right = cell.endsWith(":") ? ":" : "";
  return left + "-".repeat(width - left.length - right.length) + right;
}

function displayWidth(text: string): number {
  let width = 0;
  for (const { segment } of graphemes.segment(text)) {
    width += WIDE.test(segment) ? 2 : 1;
  }
  return width;
}
