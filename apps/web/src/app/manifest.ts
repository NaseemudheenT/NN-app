import type { MetadataRoute } from "next";

/**
 * The web app manifest — what makes NN installable to a home screen.
 *
 * `display: "standalone"` is what removes the browser chrome, so NN opens
 * like a native application rather than a tab.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "NN",
    short_name: "NN",
    description: "A private personal operating environment.",
    start_url: "/workspace",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#07111F",
    theme_color: "#07111F",
    categories: ["productivity", "personalization"],
    icons: [
      { src: "/icon", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/maskable-icon", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
    shortcuts: [
      { name: "Ask REN", short_name: "REN", url: "/workspace?ren=1" },
    ],
  };
}
