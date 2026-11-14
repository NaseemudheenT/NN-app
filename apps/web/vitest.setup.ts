import "@testing-library/jest-dom/vitest";

// jsdom implements neither matchMedia nor the reduced-motion query that the
// motion system depends on, so provide a controllable stub.
if (!window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

// jsdom ships neither observer, and the cinematic surfaces measure themselves
// with both. These stubs never fire — components must render correctly from
// their initial state, which is exactly what the tests assert.
if (!("ResizeObserver" in globalThis)) {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
}
if (!("IntersectionObserver" in globalThis)) {
  globalThis.IntersectionObserver = class {
    readonly root = null;
    readonly rootMargin = "";
    readonly thresholds: readonly number[] = [];
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords(): IntersectionObserverEntry[] {
      return [];
    }
  } as unknown as typeof IntersectionObserver;
}

// jsdom has no canvas at all, and logs a "not implemented" error every time
// anything asks for a context. NN's painted surfaces — the folder artwork,
// the logo reveal, the corridor — all check for a context and take a
// non-painting path when there is none, which is exactly the path a browser
// that refuses one takes. Returning null here exercises that path quietly,
// so a genuine error in the output still stands out.
if (typeof HTMLCanvasElement !== "undefined") {
  HTMLCanvasElement.prototype.getContext = (() =>
    null) as unknown as typeof HTMLCanvasElement.prototype.getContext;
}
