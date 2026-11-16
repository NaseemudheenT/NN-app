import { ImageResponse } from "next/og";
import { NN_MARK_PATH } from "@/components/ui/NNLogo";

/**
 * The iOS home-screen icon.
 *
 * iOS applies its own rounded-rectangle mask, so this fills the square edge
 * to edge — adding our own corner radius would produce a visible double
 * rounding on the founder's phone.
 *
 * The mark was being drawn at 300 x 270 inside a 180 x 180 icon: it
 * overflowed its own canvas and iOS cropped the N's outer stems off. It is
 * sized to the icon now, and lit the same way the browser icon is.
 */
const HALO =
  "radial-gradient(circle at 50% 46%, rgba(150,210,255,0.52) 0%, rgba(150,210,255,0) 42%)," +
  "radial-gradient(circle at 38% 36%, rgba(96,226,255,0.40) 0%, rgba(96,226,255,0) 56%)," +
  "radial-gradient(circle at 64% 60%, rgba(168,124,255,0.38) 0%, rgba(168,124,255,0) 58%)";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%", height: "100%", display: "flex",
          alignItems: "center", justifyContent: "center",
          background: "linear-gradient(155deg, #16304F 0%, #07111F 70%)",
        }}
      >
        <div style={{ position: "absolute", inset: 0, display: "flex", background: HALO }} />
        <svg width="112" height="101" viewBox="0 0 120 108">
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
    size,
  );
}
