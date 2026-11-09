import { NNIntro } from "@/components/nn/NNIntro";
import styles from "./home.module.css";

/** The silent cinematic entry to the private NN environment. */
export default function Home() {
  return (
    <main className={`${styles.page} nn-intro-page`}>
      <NNIntro enterHref="/sign-in" enterLabel="Start" />
    </main>
  );
}
