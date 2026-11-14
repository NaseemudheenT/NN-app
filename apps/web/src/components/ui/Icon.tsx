/**
 * The NN icon family. One stroke weight (1.6), one grid (24), one cap and join
 * style. Every glyph in NN comes from here — mixing icon sets is what makes an
 * interface look assembled rather than designed.
 */
export type IconName =
  | "calendar" | "check" | "clock" | "close" | "file" | "folder"
  | "graph" | "grid" | "book" | "search" | "settings" | "shield"
  | "sparkle" | "wallet" | "minus" | "expand" | "plus" | "mic";

const PATHS: Record<IconName, string> = {
  calendar: "M4 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2zM4 10h16M8 3v4M16 3v4",
  check:    "M4.5 12.5 9.5 17.5 19.5 6.5",
  clock:    "M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16M12 7.5V12l3 2",
  close:    "M6 6 18 18M18 6 6 18",
  file:     "M6 3h7l5 5v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1M13 3v5h5",
  folder:   "M3 7a2 2 0 0 1 2-2h4l2 2.5h8a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z",
  graph:    "M4 20V10M10 20V4M16 20v-7M22 20H2",
  grid:     "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z",
  book:     "M5 4.5A1.5 1.5 0 0 1 6.5 3H19v15H6.5A1.5 1.5 0 0 0 5 19.5zM5 19.5A1.5 1.5 0 0 1 6.5 18H19v3H6.5A1.5 1.5 0 0 1 5 19.5",
  search:   "M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14M16.2 16.2 21 21",
  settings: "M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6M19.4 14.5a1.5 1.5 0 0 0 .3 1.7l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.5 1.5 0 0 0-2.5 1v.3a2 2 0 1 1-4 0v-.1a1.5 1.5 0 0 0-2.6-1l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.5 1.5 0 0 0-1-2.5H3.8a2 2 0 1 1 0-4h.1a1.5 1.5 0 0 0 1-2.6l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.5 1.5 0 0 0 1.7.3h.1a1.5 1.5 0 0 0 .9-1.4V3.8a2 2 0 1 1 4 0v.1a1.5 1.5 0 0 0 2.5 1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.5 1.5 0 0 0 1 2.5h.3a2 2 0 1 1 0 4h-.1a1.5 1.5 0 0 0-1.4.9",
  shield:   "M12 3 20 6v6c0 4.5-3.2 7.9-8 9-4.8-1.1-8-4.5-8-9V6z",
  sparkle:  "M12 3.5 13.9 9 19.5 10.9 13.9 12.8 12 18.4 10.1 12.8 4.5 10.9 10.1 9zM18.5 3.5l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z",
  wallet:   "M4 8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2zM16 12.5h2.5M4 8V6.5A1.5 1.5 0 0 1 5.5 5H16",
  minus:    "M5 12h14",
  expand:   "M9 4H4v5M15 20h5v-5M20 9V4h-5M4 15v5h5",
  plus:     "M12 5v14M5 12h14",
  mic:      "M12 3a3 3 0 0 1 3 3v5a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21",
};

export interface IconProps {
  name: IconName;
  size?: number;
  /** Supply when the icon is the only content of a control. */
  title?: string;
  className?: string | undefined;
}

export function Icon({ name, size = 20, title, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      data-nn-icon={name}
      {...(title !== undefined
        ? { role: "img" as const }
        : { "aria-hidden": true as const, role: "presentation" as const })}
    >
      {title !== undefined ? <title>{title}</title> : null}
      <path d={PATHS[name]} />
    </svg>
  );
}
