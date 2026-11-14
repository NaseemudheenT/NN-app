import type { MetadataRoute } from "next";

/**
 * The web app manifest — what makes NN installable to a home screen.
 *
 * `display: "standalone"` is what removes the browser chrome, so NN opens
 * like a native application rather than a tab.
 *
 * `start_url` is the dashboard, not the landing page and not the workspace
 * prototype. Launching from the home screen should arrive in the environment
 * itself: `/` would replay the cinematic entrance on every single open, and
 * `/workspace` is a design surface rather than the place the founder works.
 * `/home` is owner-gated, so an unauthenticated launch lands on sign-in —
 * which is the right behaviour for a private operating environment.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "NN",
    short_name: "NN",
    description: "A private personal operating environment.",
    start_url: "/home",
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
      { name: "Ask REN", short_name: "REN", url: "/home?ren=1" },
      { name: "Search NN", short_name: "Search", url: "/search" },
    ],
  };
}
