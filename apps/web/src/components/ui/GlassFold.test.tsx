import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { GlassFold } from "./GlassFold";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("GlassFold fallback", () => {
  it("keeps a CSS room when WebGL is unavailable", () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
    const { container } = render(<GlassFold />);
    expect(container.querySelector("canvas")).toHaveAttribute("data-fallback", "true");
  });

  it("uses an alpha canvas so the CSS room remains visible after a shader setup failure", () => {
    const source = readFileSync(resolve(process.cwd(), "src/components/ui/GlassFold.tsx"), "utf8");
    expect(source).toContain("alpha: true");
    const css = readFileSync(resolve(process.cwd(), "src/components/ui/GlassFold.module.css"), "utf8");
    expect(css).toContain("radial-gradient");
    expect(css).toContain("data-fallback");
  });
});
