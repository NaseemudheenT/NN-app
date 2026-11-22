/**
 * The small part of Markdown REN actually writes.
 *
 * Written rather than installed. A Markdown library is a parser, a renderer,
 * a sanitiser and a plugin system, and REN's output needs four block kinds
 * and four inline ones. More to the point, every library of that shape ends
 * at `dangerouslySetInnerHTML`, and REN's text comes from a model that reads
 * the founder's own documents — the one place in NN where injected markup
 * would be read back by the founder as if NN had written it.
 *
 * So this produces a tree of plain values. The renderer builds React elements
 * from it. There is no HTML string anywhere in the path, which means there is
 * no sanitiser to get wrong.
 *
 * Unsupported syntax degrades to text rather than disappearing: a table stays
 * a row of pipes, which is ugly and legible, instead of vanishing, which is
 * neither.
 */

export type Inline =
  | { type: "text"; text: string }
  | { type: "code"; text: string }
  | { type: "strong"; text: string }
  | { type: "em"; text: string }
  | { type: "link"; text: string; href: string };

export type Block =
  | { type: "p"; parts: Inline[] }
  | { type: "heading"; level: 1 | 2 | 3; parts: Inline[] }
  | { type: "code"; language: string; text: string }
  | { type: "list"; ordered: boolean; items: Inline[][] }
  | { type: "quote"; parts: Inline[] }
  | { type: "rule" };

const FENCE = /^\s{0,3}(`{3,}|~{3,})\s*([\w+-]*)\s*$/;
const HEADING = /^\s{0,3}(#{1,3})\s+(.*)$/;
const BULLET = /^\s{0,3}[-*+]\s+(.*)$/;
const NUMBER = /^\s{0,3}(\d{1,9})[.)]\s+(.*)$/;
const QUOTE = /^\s{0,3}>\s?(.*)$/;
const RULE = /^\s{0,3}([-*_])(?:\s*\1){2,}\s*$/;

export function parseMarkdown(source: string): Block[] {
  const lines = source.replace(/\r\n?/g, "\n").split("\n");
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i] ?? "";

    if (line.trim() === "") { i++; continue; }

    // A fence that is never closed still ends the message. Treating the rest
    // as code is right: a model that is mid-code-block when it is cut off
    // was writing code, and showing it as prose mangles the indentation.
    const fence = FENCE.exec(line);
    if (fence) {
      const marker = fence[1] ?? "```";
      const language = (fence[2] ?? "").toLowerCase();
      const body: string[] = [];
      i++;
      while (i < lines.length) {
        const next = lines[i] ?? "";
        if (next.trimStart().startsWith(marker[0] ?? "`") && FENCE.test(next)) { i++; break; }
        body.push(next);
        i++;
      }
      blocks.push({ type: "code", language, text: body.join("\n") });
      continue;
    }

    if (RULE.test(line)) { blocks.push({ type: "rule" }); i++; continue; }

    const heading = HEADING.exec(line);
    if (heading) {
      const level = Math.min(3, (heading[1] ?? "#").length) as 1 | 2 | 3;
      blocks.push({ type: "heading", level, parts: parseInline(heading[2] ?? "") });
      i++;
      continue;
    }

    if (BULLET.test(line) || NUMBER.test(line)) {
      const ordered = !BULLET.test(line);
      const items: Inline[][] = [];
      while (i < lines.length) {
        const entry = lines[i] ?? "";
        const bullet = BULLET.exec(entry);
        const numbered = NUMBER.exec(entry);
        if (ordered ? !numbered : !bullet) break;
        items.push(parseInline((ordered ? numbered?.[2] : bullet?.[1]) ?? ""));
        i++;
      }
      blocks.push({ type: "list", ordered, items });
      continue;
    }

    const quote = QUOTE.exec(line);
    if (quote) {
      const body: string[] = [quote[1] ?? ""];
      i++;
      while (i < lines.length) {
        const next = QUOTE.exec(lines[i] ?? "");
        if (!next) break;
        body.push(next[1] ?? "");
        i++;
      }
      blocks.push({ type: "quote", parts: parseInline(body.join(" ")) });
      continue;
    }

    // A paragraph runs until a blank line or something that starts a block.
    const body: string[] = [];
    while (i < lines.length) {
      const next = lines[i] ?? "";
      if (
        next.trim() === "" || FENCE.test(next) || HEADING.test(next) ||
        BULLET.test(next) || NUMBER.test(next) || QUOTE.test(next) || RULE.test(next)
      ) break;
      body.push(next.trim());
      i++;
    }
    if (body.length > 0) blocks.push({ type: "p", parts: parseInline(body.join(" ")) });
  }

  return blocks;
}

/* Ordered so the longest marker wins: `**` must be tried before `*`, or
   every bold run is read as two empty emphases around its own content. */
const INLINE = [
  { re: /`([^`]+)`/, make: (m: RegExpExecArray): Inline => ({ type: "code", text: m[1] ?? "" }) },
  {
    re: /\[([^\]]+)\]\(([^)\s]+)\)/,
    make: (m: RegExpExecArray): Inline => ({ type: "link", text: m[1] ?? "", href: m[2] ?? "" }),
  },
  { re: /\*\*([^*]+)\*\*/, make: (m: RegExpExecArray): Inline => ({ type: "strong", text: m[1] ?? "" }) },
  { re: /__([^_]+)__/, make: (m: RegExpExecArray): Inline => ({ type: "strong", text: m[1] ?? "" }) },
  { re: /\*([^*]+)\*/, make: (m: RegExpExecArray): Inline => ({ type: "em", text: m[1] ?? "" }) },
] as const;

export function parseInline(source: string): Inline[] {
  const out: Inline[] = [];
  let rest = source;

  while (rest.length > 0) {
    let best: { at: number; length: number; part: Inline } | null = null;
    for (const rule of INLINE) {
      const match = rule.re.exec(rest);
      if (!match) continue;
      if (best === null || match.index < best.at) {
        best = { at: match.index, length: match[0].length, part: rule.make(match) };
      }
    }
    if (best === null) { out.push({ type: "text", text: rest }); break; }
    if (best.at > 0) out.push({ type: "text", text: rest.slice(0, best.at) });
    out.push(best.part);
    rest = rest.slice(best.at + best.length);
  }

  return out.filter((part) => part.type !== "text" || part.text !== "");
}

/**
 * Whether a link may be rendered as a link.
 *
 * REN's text is a model's output. `javascript:` and `data:` URLs in it are
 * not links the founder asked for, so they are shown as the text they are.
 */
export function safeHref(href: string): string | null {
  const trimmed = href.trim();
  return /^(https?:\/\/|mailto:|\/)/i.test(trimmed) ? trimmed : null;
}
