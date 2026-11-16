import { ImageResponse } from "next/og";
import { NN_MARK_PATH } from "@/components/ui/NNLogo";

/**
 * The PWA / browser icon, generated at build time from the locked mark.
 *
 * Generated rather than stored as a PNG so it can never drift from
 * NN_MARK_PATH — the single source of the approved geometry.
 *
 * The mark glows here the same way it glows inside NN. The light is built
 * from stacked radial gradients rather than an SVG filter, because this is
 * rendered by Satori rather than a browser and Satori does not run filters —
 * a `feGaussianBlur` here would silently produce a flat icon, which is
 * exactly what the founder was looking at on their home screen.
 */
export const size = { width: 512, height: 512 };
export const contentType = "image/png";

/** The halo, as three gradients: core, spectrum bloom, outer falloff. */
const HALO =
  "radial-gradient(circle at 50% 46%, rgba(150,210,255,0.52) 0%, rgba(150,210,255,0) 42%)," +
  "radial-gradient(circle at 38% 36%, rgba(96,226,255,0.40) 0%, rgba(96,226,255,0) 56%)," +
  "radial-gradient(circle at 64% 60%, rgba(168,124,255,0.38) 0%, rgba(168,124,255,0) 58%)";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(155deg, #16304F 0%, #07111F 70%)",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            background: HALO,
          }}
        />
        <svg width="300" height="270" viewBox="0 0 120 108">
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
