export { AuthProvider, useAuth } from "./AuthProvider";
export type { AuthPhase } from "./AuthProvider";
export {
  registerPasskey, signInWithPasskey, fetchAuthStatus, passkeysSupported, PasskeyError,
  setRecoveryPassword, signInWithRecoveryPassword, fetchRecoveryState,
} from "./passkey";
export type { AuthStatus } from "./passkey";
