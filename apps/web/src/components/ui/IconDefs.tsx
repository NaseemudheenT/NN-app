/**
 * The light every icon in NN is lit by.
 *
 * One set of filters and gradients for the whole page, mounted once in the
 * root layout beside the liquid-glass displacement map. Thirty-four
 * applications, a dock, a settings page and a composer all reference these by
 * id — duplicating them per icon would put several hundred filter primitives
 * in the document for one light source.
 *
 * What they do, in order of how much they matter:
 *
 * - **`nn-icon-lit`** turns a flat stroke into a lit solid. The alpha is
 *   blurred into a height field, a point light above and to the left is
 *   reflected off it, and the specular is composited back inside the stroke.
 *   That is the whole trick: a stroke with a highlight running along its
 *   top-left and darkness falling away under it reads as a round bar, not a
 *   line, and the eye does the rest.
 * - **`nn-icon-face`** is the material — NN's spectrum along the stroke, so
 *   an icon is made of the same light as the room it sits in.
 * - **`nn-icon-contact`** is the shadow the object casts on the glass under
 *   it. Without it the glyph floats, and a floating object has no weight.
 *
 * Coordinates are in the icon's own 24 grid, because every glyph in NN is
 * drawn on it — see `ICON_PATHS`.
 */
export function IconDefs() {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width="0"
      height="0"
      style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }}
    >
      <defs>
        <linearGradient id="nn-icon-face" x1="0" y1="0" x2="0.55" y2="1">
          <stop offset="0" stopColor="#F2F8FF" />
          <stop offset="0.38" stopColor="#B9DCFF" />
          <stop offset="0.72" stopColor="#7FA6FF" />
          <stop offset="1" stopColor="#B08CFF" />
        </linearGradient>

        {/* The same material on a pale ground, where white-on-white has no
            shape at all: the ramp is inverted so the glyph stays an object. */}
        <linearGradient id="nn-icon-face-light" x1="0" y1="0" x2="0.55" y2="1">
          <stop offset="0" stopColor="#4C86E8" />
          <stop offset="0.4" stopColor="#2A5FC4" />
          <stop offset="0.76" stopColor="#3B4FBE" />
          <stop offset="1" stopColor="#6A47C8" />
        </linearGradient>

        <filter
          id="nn-icon-lit"
          x="-40%"
          y="-40%"
          width="180%"
          height="180%"
          colorInterpolationFilters="sRGB"
        >
          {/* The height field. 0.7 on a 24 grid is about half a stroke width,
              which is what gives the bar a roundness rather than a chamfer. */}
          <feGaussianBlur in="SourceAlpha" stdDeviation="0.62" result="height" />
          <feSpecularLighting
            in="height"
            surfaceScale="4.2"
            specularConstant="1.35"
            specularExponent="14"
            lightingColor="#FFFFFF"
            result="spec"
          >
            <fePointLight x="-7" y="-9" z="16" />
          </feSpecularLighting>
          {/* Clipped back inside the stroke: a specular that spills past the
              object's own silhouette is a glow, not a highlight. */}
          <feComposite in="spec" in2="SourceAlpha" operator="in" result="lit" />
          <feComposite
            in="SourceGraphic"
            in2="lit"
            operator="arithmetic"
            k1="0"
            k2="1"
            k3="1.1"
            k4="0"
          />
        </filter>

        <filter
          id="nn-icon-contact"
          x="-50%"
          y="-50%"
          width="200%"
          height="200%"
          colorInterpolationFilters="sRGB"
        >
          <feGaussianBlur in="SourceAlpha" stdDeviation="0.85" />
          <feOffset dy="1.1" result="cast" />
          <feComponentTransfer in="cast">
            <feFuncA type="linear" slope="0.5" />
          </feComponentTransfer>
        </filter>

        {/* ------------------------------------------------------ REN ----- */}

        {/* REN's mark, at icon scale. The orb on REN's own surface is a ray
            marched WebGL2 sphere and cannot be mounted five times in a dock
            — so the same object is restated here in four gradients: the
            spectrum body lit from inside, the bright rim where the shell
            turns away, the shadow where it turns past the light, and the
            specular where it faces it. Same light, same colours, a fraction
            of the cost. Drawn on a 40 grid. */}
        <radialGradient id="nn-ren-body" cx="0.36" cy="0.3" r="0.82">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="0.15" stopColor="#D6F6FF" />
          <stop offset="0.34" stopColor="#4FD8F5" />
          <stop offset="0.57" stopColor="#3A7BF0" />
          <stop offset="0.8" stopColor="#5B46D8" />
          <stop offset="1" stopColor="#7C3FC6" />
        </radialGradient>

        <radialGradient id="nn-ren-rim" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0.7" stopColor="#FFFFFF" stopOpacity="0" />
          <stop offset="0.92" stopColor="#E6F6FF" stopOpacity="0.62" />
          <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
        </radialGradient>

        <radialGradient id="nn-ren-shade" cx="0.74" cy="0.82" r="0.68">
          <stop offset="0" stopColor="#04081E" stopOpacity="0.52" />
          <stop offset="0.62" stopColor="#04081E" stopOpacity="0.1" />
          <stop offset="1" stopColor="#04081E" stopOpacity="0" />
        </radialGradient>

        <radialGradient id="nn-ren-gloss" cx="0.34" cy="0.22" r="0.34">
          <stop offset="0" stopColor="#FFFFFF" stopOpacity="0.92" />
          <stop offset="0.55" stopColor="#FFFFFF" stopOpacity="0.22" />
          <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
        </radialGradient>

        <linearGradient id="nn-ren-ring" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#6FE9FF" stopOpacity="0.95" />
          <stop offset="0.5" stopColor="#7FA6FF" stopOpacity="0.5" />
          <stop offset="1" stopColor="#B07CFF" stopOpacity="0.9" />
        </linearGradient>

        {/* The half of the orbit that passes in front of the sphere. */}
        <clipPath id="nn-ren-front">
          <rect x="0" y="20" width="40" height="20" />
        </clipPath>

        {/* The light the orb throws onto whatever it is sitting on. */}
        <filter
          id="nn-ren-bloom"
          x="-60%"
          y="-60%"
          width="220%"
          height="220%"
          colorInterpolationFilters="sRGB"
        >
          <feGaussianBlur stdDeviation="2.4" />
        </filter>
      </defs>
    </svg>
  );
}

export default IconDefs;
