/**
 * Segment-aware route matching for NN's application chrome.
 *
 * A workspace owns its nested pages too: /life/tasks is still Life, but
 * /lifestyle must never be mistaken for /life. Trailing slashes are ignored
 * because they do not change the destination.
 */
export function matchesPathname(pathname: string, route: string | undefined): boolean {
  if (!route || !route.startsWith("/") || !pathname.startsWith("/")) return false;

  const clean = (value: string) =>
    value.length > 1 ? value.replace(/\/+$/, "") : value;

  const current = clean(pathname);
  const base = clean(route);

  return current === base || (base !== "/" && current.startsWith(`${base}/`));
}
