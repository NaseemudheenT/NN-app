import { NNIntro } from "@/components/nn/NNIntro";
import { LiquidButton } from "@/components/ui";
import styles from "./home.module.css";

/** The entrance to NN. A quiet introduction, followed by clear paths in. */
export default function Home() {
  return (
    <main className={styles.page}>
      <NNIntro enterHref="/sign-in" enterLabel="Enter NN" />

      <section className={`${styles.below} nn-scrim`}>
        <p className={styles.status}>NN · Personal operating environment</p>
        <h2 className={styles.heading}>Your space. Your system.</h2>
        <p className={styles.lede}>
          One calm environment for work, learning and life.
        </p>

        <div className={styles.actions}>
          <LiquidButton href="/design" size="lg" variant="accent">
            Explore design
          </LiquidButton>
          <LiquidButton href="/workspace" size="lg">
            Open workspace
          </LiquidButton>
        </div>

        <p className={styles.honest}>
          Workspace metrics are illustrative sample data. REN&rsquo;s AI capabilities
          are not active yet.
        </p>
      </section>
    </main>
  );
}
