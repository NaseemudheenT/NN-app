import { ImageResponse } from "next/og";
import { NN_MARK_PATH } from "@/components/ui";

export const runtime = "nodejs";

/**
 * Android maskable icon.
 *
 * Android crops this to an arbitrary shape, so the mark sits inside the
 * inner 80% safe zone — otherwise a circular mask would clip the outer
 * stems of the N forms.
 */
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
        <svg width="250" height="202" viewBox="0 0 94 76">
          <path d={NN_MARK_PATH} fill="#F7F9FC" fillRule="nonzero" />
        </svg>
      </div>
    ),
    { width: 512, height: 512 },
  );
}
