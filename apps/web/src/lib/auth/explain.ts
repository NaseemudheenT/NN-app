/**
 * Firebase's error codes, as sentences.
 *
 * `Firebase: Error (auth/configuration-not-found).` is what the founder saw
 * after typing a password that was entirely correct. The server had verified
 * it, minted a token and handed it back; the browser then failed to exchange
 * that token for a session, and reported it in a form that names no cause
 * and suggests no action. It read as "your password is wrong". It was not.
 *
 * Every one of these is a condition NN can describe precisely, so none of
 * them should reach the founder as a code. The last line of defence is the
 * fallback: an unrecognised code is still passed through, because an ugly
 * error the founder can search for beats a friendly one that hides what
 * happened.
 */

export function explainAuthError(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);
  const code = /auth\/([a-z-]+)/.exec(raw)?.[1] ?? "";

  switch (code) {
    case "configuration-not-found":
      /*
       * Authentication has never been switched on for the Firebase project.
       * Not a credential problem, not a code problem, and not fixable from
       * here: the API that provisions it answers BILLING_NOT_ENABLED, while
       * the console does it free in one click.
       */
      return (
        "Your password was accepted, but NN could not finish signing you in: "
        + "Firebase Authentication has not been switched on for this project. "
        + "Open the Firebase console → Authentication → Get started, then try "
        + "again. It is free and takes one click."
      );
    case "network-request-failed":
      return "NN could not reach the sign-in service. Check your connection and try again.";
    case "invalid-custom-token":
    case "custom-token-mismatch":
      return "NN's sign-in token was refused. This deployment's server credentials do not match its Firebase project.";
    case "user-disabled":
      return "This account has been disabled.";
    case "too-many-requests":
      return "Too many attempts. Wait a moment and try again.";
    case "operation-not-allowed":
      return "This way of signing in is switched off for the project. Enable it in the Firebase console.";
    case "internal-error":
      return "The sign-in service failed unexpectedly. Try again; if it persists, the project's Authentication setup is incomplete.";
    default:
      // Not recognised. The founder gets the real text rather than a
      // reassuring sentence that tells them nothing.
      return raw;
  }
}
