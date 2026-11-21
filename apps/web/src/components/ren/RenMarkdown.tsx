"use client";

import { useMemo, useState, type ReactNode } from "react";
import { parseMarkdown, safeHref, type Block, type Inline } from "@/lib/ren/markdown";
import styles from "./RenMarkdown.module.css";

/**
 * REN's answers, rendered.
 *
 * Builds React elements from the parsed tree — never an HTML string — so
 * there is no place for markup in a model's output to become markup on the
 * founder's screen.
 *
 * Code blocks get a language label and a copy button, because the founder
 * asked REN to write code and code you cannot copy is a picture of code.
 */

function inline(parts: Inline[]): ReactNode[] {
  return parts.map((part, i) => {
    switch (part.type) {
      case "code":
        return <code key={i} className={styles.inlineCode}>{part.text}</code>;
      case "strong":
        return <strong key={i}>{part.text}</strong>;
      case "em":
        return <em key={i}>{part.text}</em>;
      case "link": {
        const href = safeHref(part.href);
        // A link REN cannot be trusted to have meant is shown as its text.
        if (href === null) return <span key={i}>{part.text}</span>;
        return (
          <a key={i} href={href} target="_blank" rel="noopener noreferrer nofollow">
            {part.text}
          </a>
        );
      }
      default:
        return <span key={i}>{part.text}</span>;
    }
  });
}

function CodeBlock({ language, text }: { language: string; text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <figure className={styles.code}>
      <figcaption>
        <span>{language || "code"}</span>
        <button
          type="button"
          onClick={() => {
            void navigator.clipboard?.writeText(text).then(
              () => { setCopied(true); window.setTimeout(() => setCopied(false), 1600); },
              // Clipboard access can be refused. Saying so beats a button
              // that looks like it worked.
              () => setCopied(false),
            );
          }}
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </figcaption>
      <pre><code>{text}</code></pre>
    </figure>
  );
}

function block(entry: Block, key: number): ReactNode {
  switch (entry.type) {
    case "heading": {
      const Tag = (["h3", "h4", "h5"] as const)[entry.level - 1] ?? "h4";
      return <Tag key={key} className={styles.heading}>{inline(entry.parts)}</Tag>;
    }
    case "code":
      return <CodeBlock key={key} language={entry.language} text={entry.text} />;
    case "list":
      return entry.ordered ? (
        <ol key={key} className={styles.list}>
          {entry.items.map((item, i) => <li key={i}>{inline(item)}</li>)}
        </ol>
      ) : (
        <ul key={key} className={styles.list}>
          {entry.items.map((item, i) => <li key={i}>{inline(item)}</li>)}
        </ul>
      );
    case "quote":
      return <blockquote key={key} className={styles.quote}>{inline(entry.parts)}</blockquote>;
    case "rule":
      return <hr key={key} className={styles.rule} />;
    default:
      return <p key={key} className={styles.paragraph}>{inline(entry.parts)}</p>;
  }
}

export function RenMarkdown({ text }: { text: string }) {
  const blocks = useMemo(() => parseMarkdown(text), [text]);
  return <div className={styles.root}>{blocks.map(block)}</div>;
}

export default RenMarkdown;
