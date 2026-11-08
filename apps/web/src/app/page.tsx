import Link from "next/link";
import { HoloShowcase } from "@/components/nn/HoloShowcase";
import styles from "./home.module.css";

/**
 * The entrance to NN. Deliberately spare: the real dashboard, authentication
 * and applications arrive in later phases, and a mock dashboard here would be
 * exactly the decorative placeholder the specification forbids.
 */
export default function Home() {
  return (
    <main className={styles.page}>
      <HoloShowcase />
      <div className={styles.below}>
        <p className={styles.status}>Phase 1 — design system complete</p>
        <p className={styles.lede}>
          Authentication, the dashboard and the applications are not built yet.
          What exists today is the foundation everything else is made from.
        </p>
        <Link href="/design" className={styles.cta}>
          Open the design system
          <span aria-hidden="true">→</span>
        </Link>
      </div>
    </main>
  );
}
