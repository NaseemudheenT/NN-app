"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { inPreview, leavePreview } from "@/lib/preview";
import styles from "./PreviewBanner.module.css";

/**
 * The mark of a surface entered without an account.
 *
 * It is on every gated surface, it is not dismissible, and it says the two
 * things that matter: nobody is signed in, and nothing here is the founder's
 * real data. A preview that can be mistaken for the real environment is worse
 * than no preview at all.
 */
export function PreviewBanner() {
  // Read after mount: sessionStorage does not exist on the server, and the
  // first client render has to match the HTML it is hydrating.
  const [showing, setShowing] = useState(false);
  const router = useRouter();

  useEffect(() => { setShowing(inPreview()); }, []);

  if (!showing) return null;

  return (
    <div className={styles.banner} role="status">
      <span className={styles.dot} aria-hidden="true" />
      <p>
        <strong>Exploring NN</strong>
        <span>Nobody is signed in. Your records are not loaded, and nothing here is saved.</span>
      </p>
      <button
        type="button"
        onClick={() => {
          leavePreview();
          router.replace("/sign-in");
        }}
      >
        Leave
      </button>
    </div>
  );
}
