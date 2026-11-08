import { NNIntro } from "@/components/nn/NNIntro";
import { LiquidButton } from "@/components/ui";
import styles from "./home.module.css";

/**
 * The entrance to NN.
 *
 * The corridor is the first thing: NN introduces itself by showing what it
 * holds. Below it, in plain type, is an honest account of what is actually
 * built — because an entrance that oversells is a worse entrance.
 */
export default function Home() {
  return (
    <main className={styles.page}>
      <NNIntro enterHref="/sign-in" enterLabel="Enter NN" />

      <section className={`${styles.below} nn-scrim`}>
        <p className={styles.status}>Design phase · November 2026</p>
        <h2 className={styles.heading}>Built inch by inch, in the open.</h2>
        <p className={styles.lede}>
          The design system, the environment, the glass, the motion and the workspace
          surface are real and running. Authentication is real. What comes next is the
          operating system itself.
        </p>

        <div className={styles.actions}>
          <LiquidButton href="/design" size="lg" variant="accent">
            Open the design system
          </LiquidButton>
          <LiquidButton href="/workspace" size="lg">
            See the workspace
          </LiquidButton>
        </div>

        <p className={styles.honest}>
          <strong>Where NN actually stands.</strong> The room behind this page is a WebGL
          shader, the controls are real glass, and the workspace surface is fully
          interactive — but its contents are illustrative sample data, clearly labelled.{" "}
          <strong>REN is designed and integrated everywhere, and switched off.</strong>{" "}
          Its reasoning, memory and tools stay inert until you turn them on.
        </p>
      </section>
    </main>
  );
}
