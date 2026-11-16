import { ImageResponse } from "next/og";
import { NN_MARK_PATH } from "@/components/ui/NNLogo";

export const runtime = "nodejs";

/**
 * Android maskable icon.
 *
 * Android crops this to an arbitrary shape, so the mark sits inside the
 * inner 80% safe zone — otherwise a circular mask would clip the outer
 * stems of the N forms. The glow stays inside that zone too: a halo that is
 * cropped on one side reads as a printing error.
 */
const HALO =
  "radial-gradient(circle at 50% 46%, rgba(150,210,255,0.52) 0%, rgba(150,210,255,0) 42%)," +
  "radial-gradient(circle at 38% 36%, rgba(96,226,255,0.40) 0%, rgba(96,226,255,0) 56%)," +
  "radial-gradient(circle at 64% 60%, rgba(168,124,255,0.38) 0%, rgba(168,124,255,0) 58%)";

export function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%", height: "100%", display: "flex",
          alignItems: "center", justifyContent: "center",
          background: "#07111F",
        }}
      >
        <div style={{ position: "absolute", inset: 0, display: "flex", background: HALO }} />
        <svg width="240" height="216" viewBox="0 0 120 108">
          <defs>
            <linearGradient id="nn-icon-mark" x1="0" y1="0" x2="0.82" y2="1">
              <stop offset="0" stopColor="#FFFFFF" />
              <stop offset="0.32" stopColor="#CDEBFF" />
              <stop offset="0.66" stopColor="#9FC2FF" />
              <stop offset="1" stopColor="#CBAEFF" />
            </linearGradient>
          </defs>
          <path d={NN_MARK_PATH} fill="url(#nn-icon-mark)" />
        </svg>
      </div>
    ),
    { width: 512, height: 512 },
  );
}
