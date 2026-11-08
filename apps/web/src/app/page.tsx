import Link from "next/link";
import { NNLockup } from "@/components/ui";

/**
 * Deliberately minimal. The real dashboard is Phase 3 — showing a mock one
 * here would be exactly the decorative placeholder the specification forbids.
 */
export default function Home() {
  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "grid",
        placeItems: "center",
        padding: "var(--space-9)",
      }}
    >
      <div style={{ textAlign: "center", maxWidth: 440 }}>
        <div style={{ display: "flex", justifyContent: "center" }}>
          <NNLockup size={44} />
        </div>
        <p
          style={{
            marginTop: "var(--space-7)",
            color: "var(--text-secondary)",
            fontSize: "var(--text-lg-size)",
            lineHeight: 1.6,
          }}
        >
          Phase 1 — the design system is built. The dashboard, authentication and
          applications arrive in later phases.
        </p>
        <p style={{ marginTop: "var(--space-9)" }}>
          <Link
            href="/design"
            style={{
              color: "var(--text-accent)",
              fontWeight: "var(--weight-medium)",
              textDecorationThickness: 1,
              textUnderlineOffset: 4,
            }}
          >
            Open the design system →
          </Link>
        </p>
      </div>
    </main>
  );
}
