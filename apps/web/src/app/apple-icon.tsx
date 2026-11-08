import { ImageResponse } from "next/og";
import { NN_MARK_PATH } from "@/components/ui";

/**
 * The iOS home-screen icon.
 *
 * iOS applies its own rounded-rectangle mask, so this fills the square edge
 * to edge — adding our own corner radius would produce a visible double
 * rounding on the founder's phone.
 */
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
        <svg width="102" height="82" viewBox="0 0 94 76">
          <path d={NN_MARK_PATH} fill="#F7F9FC" fillRule="nonzero" />
        </svg>
      </div>
    ),
    size,
  );
}
