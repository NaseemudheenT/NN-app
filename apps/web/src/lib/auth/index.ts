export { AuthProvider, useAuth } from "./AuthProvider";
export type { AuthPhase } from "./AuthProvider";
export {
  registerPasskey, signInWithPasskey, fetchAuthStatus, passkeysSupported, PasskeyError,
} from "./passkey";
export type { AuthStatus } from "./passkey";
