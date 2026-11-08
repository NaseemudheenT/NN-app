import { ImageResponse } from "next/og";
import { NN_MARK_PATH } from "@/components/ui";

/**
 * The PWA / browser icon, generated at build time from the locked mark.
 *
 * Generated rather than stored as a PNG so it can never drift from
 * NN_MARK_PATH — the single source of the approved geometry.
 */
export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%", height: "100%", display: "flex",
          alignItems: "center", justifyContent: "center",
          background: "linear-gradient(155deg, #16304F 0%, #07111F 70%)",
        }}
      >
        <svg width="300" height="243" viewBox="0 0 94 76">
          <path d={NN_MARK_PATH} fill="#F7F9FC" fillRule="nonzero" />
        </svg>
      </div>
    ),
    size,
  );
}
