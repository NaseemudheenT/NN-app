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
const MARK = "#FFFFFF";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%", height: "100%", display: "flex",
          alignItems: "center", justifyContent: "center",
          background: "linear-gradient(145deg, #202124 0%, #080809 72%)",
        }}
      >
        <svg width="108" height="98" viewBox="0 0 120 108"><path d={NN_MARK_PATH} fill={MARK} /></svg>
      </div>
    ),
    size,
  );
}
