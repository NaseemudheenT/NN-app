"use client";

import type { ButtonHTMLAttributes, ComponentProps, ReactNode } from "react";
import Link from "next/link";
import styles from "./LiquidButton.module.css";

/**
 * NN's primary control: a slab of real glass.
 *
 * The look is carried by two stacked layers that the label floats above —
 *
 *   1. a nine-part box-shadow stack that models the physics of a glass edge:
 *      a tight bright rim, a second fainter line just inside it for the
 *      material's thickness, an inner bloom, and an outer drop. No single
 *      shadow does this; the stack is the material.
 *   2. a `backdrop-filter` driven by an SVG displacement map, so whatever sits
 *      behind the button is genuinely refracted rather than merely blurred.
 *
 * The refraction needs <LiquidGlassDefs /> mounted once in the document. NN
 * mounts it in the root layout. Where `backdrop-filter: url()` is unsupported
 * (currently Safari and Firefox) the filter is ignored and the shadow stack
 * alone still reads as glass — so the control degrades, never breaks.
 */

export type LiquidButtonVariant = "clear" | "accent" | "danger";
export type LiquidButtonSize = "sm" | "md" | "lg" | "xl" | "xxl" | "icon";
export type LiquidButtonShape = "pill" | "rounded";

type NativeButton = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children">;

export interface LiquidButtonProps extends NativeButton {
  variant?: LiquidButtonVariant;
  size?: LiquidButtonSize;
  /**
   * The glass layers are drawn as a pill by default, which is the shape the
   * edge-light stack was modelled for. `rounded` matches NN's panel radius.
   */
  shape?: LiquidButtonShape;
  loading?: boolean;
  /**
   * Renders an in-app link that looks and behaves like the button. Typed from
   * Link itself, so `typedRoutes` still checks the destination exists.
   */
  href?: ComponentProps<typeof Link>["href"];
  children?: ReactNode;
}

const VARIANT: Record<LiquidButtonVariant, string | undefined> = {
  clear: styles.clear,
  accent: styles.accent,
  danger: styles.danger,
};

const SIZE: Record<LiquidButtonSize, string | undefined> = {
  sm: styles.sm,
  md: styles.md,
  lg: styles.lg,
  xl: styles.xl,
  xxl: styles.xxl,
  icon: styles.icon,
};

/** The two glass plates and the label, shared by the button and link forms. */
function Faces({ children }: { children: ReactNode }) {
  return (
    <>
      <span className={styles.edge} aria-hidden="true" />
      <span className={styles.refraction} aria-hidden="true" />
      <span className={styles.label}>{children}</span>
    </>
  );
}

export function LiquidButton({
  variant = "clear",
  size = "xxl",
  shape = "pill",
  loading = false,
  disabled = false,
  href,
  className,
  children,
  ...rest
}: LiquidButtonProps) {
  const cls = [
    styles.liquid,
    VARIANT[variant],
    SIZE[size],
    shape === "rounded" ? styles.rounded : styles.pill,
    loading ? styles.loading : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  if (href !== undefined && !disabled && !loading) {
    return (
      <Link href={href} className={cls}>
        <Faces>{children}</Faces>
      </Link>
    );
  }

  return (
    <button
      type="button"
      className={cls}
      disabled={disabled || loading}
      aria-busy={loading}
      {...rest}
    >
      <Faces>
        {children}
        {loading ? <span className="nn-sr-only">Working</span> : null}
      </Faces>
    </button>
  );
}

/**
 * The displacement map every liquid surface in NN refracts through. Mounted
 * once per document — the filter is referenced by id, so duplicating it per
 * button would duplicate the id and leave the browser resolving whichever it
 * saw last.
 */
export function LiquidGlassDefs() {
  return (
    <svg className={styles.defs} aria-hidden="true" focusable="false">
      <defs>
        <filter
          id="nn-liquid-glass"
          x="0%"
          y="0%"
          width="100%"
          height="100%"
          colorInterpolationFilters="sRGB"
        >
          {/* Turbulent noise, blurred, becomes the surface's irregularity. */}
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.05 0.05"
            numOctaves="1"
            seed="1"
            result="turbulence"
          />
          <feGaussianBlur in="turbulence" stdDeviation="2" result="blurredNoise" />
          {/* Push the backdrop around using that noise: this is the refraction. */}
          <feDisplacementMap
            in="SourceGraphic"
            in2="blurredNoise"
            scale="70"
            xChannelSelector="R"
            yChannelSelector="B"
            result="displaced"
          />
          <feGaussianBlur in="displaced" stdDeviation="4" result="finalBlur" />
          <feComposite in="finalBlur" in2="finalBlur" operator="over" />
        </filter>
      </defs>
    </svg>
  );
}
