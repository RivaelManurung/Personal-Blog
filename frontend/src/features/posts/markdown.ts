import { marked } from "marked";
import { sanitizeHtml } from "@/lib/sanitize";

export interface ImportedArticle {
  /** Sanitized HTML body, ready for the rich text editor. */
  html: string;
  /** First H1 text, if present — suggested as the post title. */
  title?: string;
  /** First paragraph, trimmed — suggested as the excerpt. */
  excerpt?: string;
}

// README H1 becomes the title; remaining headings are normalized to the
// editor's supported levels (h2/h3). Deeper levels flatten to h3.
const HEADING_LEVEL: Record<string, number> = {
  H1: 2,
  H2: 2,
  H3: 3,
  H4: 3,
  H5: 3,
  H6: 3,
};

/**
 * Convert Pandoc "simple tables" (space-aligned columns under a dashed rule
 * like `----- ----- -----`) into GFM pipe tables. marked only understands pipe
 * tables, so without this a simple table degrades into a paragraph plus an <hr>.
 * Column boundaries come from the positions of the dash groups on the rule line,
 * which is how Pandoc aligns the columns.
 */
function pandocSimpleTablesToPipe(markdown: string): string {
  const lines = markdown.split("\n");
  // A separator rule has 2+ dash groups separated by spaces — distinguishes it
  // from a thematic break (`---`) or a setext heading underline.
  const isRule = (line: string) => /^\s*-{2,}(?:\s+-{2,})+\s*$/.test(line);

  const out: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const rule = lines[i];
    const header = i > 0 ? lines[i - 1] : undefined;

    if (isRule(rule) && header && header.trim() !== "" && out.length > 0) {
      const starts: number[] = [];
      const re = /-{2,}/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(rule))) starts.push(m.index);

      // Each column runs from its dash-group start to the next group's start;
      // the last column extends to the end of the line.
      const cells = (line: string) =>
        starts.map((start, idx) => {
          const end = idx + 1 < starts.length ? starts[idx + 1] : line.length;
          return line.slice(start, end).trim();
        });

      out.pop(); // drop the header line we already emitted; re-emit as a table
      const headerCells = cells(header);

      let j = i + 1;
      const rows: string[] = [];
      for (; j < lines.length && lines[j].trim() !== ""; j++) {
        rows.push("| " + cells(lines[j]).join(" | ") + " |");
      }

      out.push(""); // keep the table as its own block
      out.push("| " + headerCells.join(" | ") + " |");
      out.push("| " + headerCells.map(() => "---").join(" | ") + " |");
      out.push(...rows);
      out.push("");
      i = j - 1; // resume after the consumed rows
      continue;
    }
    out.push(rule);
  }
  return out.join("\n");
}

/**
 * Convert Markdown (e.g. an uploaded README) into an editable article.
 * Browser-only (uses DOMParser); call from a client component.
 */
export function markdownToArticle(markdown: string): ImportedArticle {
  const preprocessed = pandocSimpleTablesToPipe(markdown);
  const rawHtml = marked.parse(preprocessed, { async: false, gfm: true }) as string;
  const doc = new DOMParser().parseFromString(rawHtml, "text/html");

  // Lift the first H1 out as the title.
  let title: string | undefined;
  const firstH1 = doc.querySelector("h1");
  if (firstH1) {
    title = firstH1.textContent?.trim().slice(0, 200) || undefined;
    firstH1.remove();
  }

  // Normalize remaining headings to the editor's h2/h3 range.
  doc.querySelectorAll("h1, h2, h3, h4, h5, h6").forEach((h) => {
    const level = HEADING_LEVEL[h.tagName] ?? 3;
    const replacement = doc.createElement(`h${level}`);
    replacement.innerHTML = h.innerHTML;
    h.replaceWith(replacement);
  });

  const firstParagraph = doc.querySelector("p");
  const excerpt = firstParagraph?.textContent?.trim().replace(/\s+/g, " ").slice(0, 300) || undefined;

  return {
    html: sanitizeHtml(doc.body.innerHTML),
    title,
    excerpt,
  };
}

const MAX_FILE_BYTES = 1 << 20; // 1 MiB
const ACCEPTED = /\.(md|markdown|mdown|mkd|txt)$/i;

/** Validate + read an uploaded markdown file into an ImportedArticle. */
export async function importMarkdownFile(file: File): Promise<ImportedArticle> {
  if (!ACCEPTED.test(file.name)) {
    throw new Error("Please upload a .md, .markdown, or .txt file");
  }
  if (file.size > MAX_FILE_BYTES) {
    throw new Error("File is too large (max 1 MB)");
  }
  const text = await file.text();
  if (!text.trim()) {
    throw new Error("The file is empty");
  }
  return markdownToArticle(text);
}
