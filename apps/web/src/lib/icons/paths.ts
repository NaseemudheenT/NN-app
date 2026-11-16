/**
 * The NN icon family's geometry.
 *
 * One stroke weight (1.6), one grid (24), one cap and join style. Every glyph
 * in NN comes from here — mixing icon sets is what makes an interface look
 * assembled rather than designed.
 *
 * Kept apart from the component because the renderer in `render.ts` needs the
 * geometry and the component needs the renderer. In one file that is a cycle;
 * in two it is a shared dependency.
 */

export type IconName =
  | "calendar" | "check" | "clock" | "close" | "file" | "folder"
  | "graph" | "grid" | "book" | "search" | "settings" | "shield"
  | "sparkle" | "wallet" | "minus" | "expand" | "plus" | "mic"
  | "archive" | "bolt" | "brain" | "briefcase" | "camera"
  | "cap" | "circuit" | "compass" | "cube" | "flame"
  | "flow" | "formula" | "globe" | "language" | "layers"
  | "mail" | "moon" | "pen" | "people" | "plane"
  | "pulse" | "sliders" | "trend" | "trophy" | "vault";

/** The glyph geometry, shared with anything that rasterises an icon. */
export const ICON_PATHS: Record<IconName, string> = {
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
  archive:  "M3.4 5h17.2v3.4H3.4zM4.9 8.4v10.1a1 1 0 0 0 1 1h12.2a1 1 0 0 0 1-1V8.4M9.6 12.2h4.8",
  bolt:     "M13.4 3 5.6 13.4h5.4L10.6 21l7.8-10.4H13z",
  brain:    "M12 5.2A3.2 3.2 0 0 0 6 6.6a3 3 0 0 0-1.4 5 3.2 3.2 0 0 0 1.7 4.8A3 3 0 0 0 12 17zM12 5.2A3.2 3.2 0 0 1 18 6.6a3 3 0 0 1 1.4 5 3.2 3.2 0 0 1-1.7 4.8A3 3 0 0 1 12 17zM12 5.2V21",
  briefcase:"M4 8h16a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1M8.8 8V5.8A1.3 1.3 0 0 1 10.1 4.5h3.8a1.3 1.3 0 0 1 1.3 1.3V8M3 13h18",
  camera:   "M4 8h3l1.4-2.2h7.2L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1M15.4 13.4a3.4 3.4 0 1 1-6.8 0 3.4 3.4 0 0 1 6.8 0",
  cap:      "M2.6 9 12 4.4 21.4 9 12 13.6zM6.6 11v4.9c0 1.6 2.4 2.8 5.4 2.8s5.4-1.2 5.4-2.8V11M20.6 9.4v5",
  circuit:  "M5.5 9V5.8h3.2M18.5 9V5.8h-3.2M5.5 15v3.2h3.2M18.5 15v3.2h-3.2M9 9h6v6H9zM3 12h2.5M18.5 12H21M12 3v2.8M12 18.2V21",
  compass:  "M12 3.6a8.4 8.4 0 1 0 0 16.8 8.4 8.4 0 0 0 0-16.8M15.4 8.6l-2 4.8-4.8 2 2-4.8z",
  cube:     "M12 3.2 20 7.6v8.8L12 20.8 4 16.4V7.6zM4.2 7.7 12 12l7.8-4.3M12 12v8.8",
  flame:    "M12 3c2.6 3.1 4.2 5.4 4.2 7.4 0 1.4-.7 2.4-1.7 2.9.5-2-.6-3.8-2.5-5.3.4 3-1.6 4-2.9 5.6a4.6 4.6 0 0 0-1.1 3C8 19 9.8 21 12 21s4-1.9 4-4.3c0-1.3-.4-2.3-1.1-3.4M12 3C8.6 5.9 6.6 8.6 6.6 11.3c0 1 .2 1.9.6 2.7",
  flow:     "M6.2 4.6h3.6v3.6H6.2zM14.2 15.8h3.6v3.6h-3.6zM6.2 15.8h3.6v3.6H6.2zM8 8.2v7.6M9.8 6.4h4.6a1.6 1.6 0 0 1 1.6 1.6v7.8",
  formula:  "M6.5 20V8.4c0-2.8 1.3-4.4 3.5-4.4h1M5 10h6M13.5 10.5l5 7M18.5 10.5l-5 7",
  globe:    "M12 3.6a8.4 8.4 0 1 0 0 16.8 8.4 8.4 0 0 0 0-16.8M3.8 12h16.4M12 3.6c2.4 2.3 2.4 14.5 0 16.8M12 3.6c-2.4 2.3-2.4 14.5 0 16.8",
  language: "M3.5 6.4h7.8M7.2 4.6v1.8M9.2 6.4c-.4 4-2.8 7.3-5.7 8.6M5.4 10.9c1.2 1.9 3 3.2 5 3.9M12.8 20l3.8-9.6L20.4 20M14.2 16.7h4.8",
  layers:   "M12 3.4 21 8l-9 4.6L3 8zM4.6 12 12 15.8 19.4 12M4.6 16 12 19.8 19.4 16",
  mail:     "M3.4 7a1 1 0 0 1 1-1h15.2a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4.4a1 1 0 0 1-1-1zM3.8 7.4 12 13l8.2-5.6",
  moon:     "M20 14.2A8.4 8.4 0 0 1 9.4 4a8.6 8.6 0 1 0 10.6 10.2",
  pen:      "M4 20.2 4.9 16 16.4 4.6a1.9 1.9 0 0 1 2.7 0l.4.4a1.9 1.9 0 0 1 0 2.7L8 19.2zM14.6 6.5l3.1 3.1",
  people:   "M9 11.5a3.4 3.4 0 1 0 0-6.8 3.4 3.4 0 0 0 0 6.8M2.8 19.6c.9-3 3.3-4.6 6.2-4.6s5.3 1.6 6.2 4.6M16.2 5.1a3.4 3.4 0 0 1 0 6.6M17.6 15.2c2 .5 3.3 1.9 3.9 4",
  plane:    "M20.6 12.3 3.9 5.6l2.6 6.7-2.6 6.3zM6.5 12.3h6.4",
  pulse:    "M3 12h3.5l2-5 3 10 2.5-6 1.5 3H21",
  sliders:  "M5 5v5.4M5 13.4V19M12 5v2.4M12 10.4V19M19 5v8.4M19 16.4V19M3.2 11.9h3.6M10.2 8.9h3.6M17.2 14.9h3.6",
  trend:    "M3.5 17.5 9 12l3.4 3.4L20.5 7M15.6 7h4.9v4.9M3.5 21h17",
  trophy:   "M7.4 4h9.2v5.2a4.6 4.6 0 0 1-9.2 0zM7.4 5.6H4.6v1.6a3 3 0 0 0 2.9 3M16.6 5.6h2.8v1.6a3 3 0 0 1-2.9 3M12 13.8V17M8.6 20h6.8",
  vault:    "M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1M13 12a2.6 2.6 0 1 1-5.2 0 2.6 2.6 0 0 1 5.2 0M10.4 6.8v2.6M10.4 14.6v2.6M17 10h1.6M17 14h1.6",
};

