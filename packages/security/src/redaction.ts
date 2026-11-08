/**
 * Keeps secrets out of logs.
 *
 * Structured logging is how NN will be debugged for years. The moment an
 * access token or a passkey counter reaches a log line it has escaped every
 * other control, so redaction happens at the boundary rather than being
 * remembered at each call site.
 */

const SENSITIVE_KEY = /(password|passcode|secret|token|apikey|api_key|authorization|cookie|credential|privatekey|private_key|refresh|bearer|otp|pin|ssn|cvv)/i;

/** Patterns that look like credentials even in a field named innocently. */
const SENSITIVE_VALUE: readonly RegExp[] = [
  /\bsk-[A-Za-z0-9_-]{16,}\b/,            // OpenAI-style keys
  /\bsk-ant-[A-Za-z0-9_-]{16,}\b/,        // Anthropic-style keys
  /\bgh[pousr]_[A-Za-z0-9]{16,}\b/,       // GitHub tokens
  /\bey[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/, // JWTs
  /\bAIza[0-9A-Za-z_-]{30,}\b/,           // Google API keys
];

export const REDACTED = "[redacted]";

function redactString(value: string): string {
  let out = value;
  for (const pattern of SENSITIVE_VALUE) out = out.replace(pattern, REDACTED);
  return out;
}

/**
 * Returns a copy safe to log. Depth-limited so a cyclic or pathologically
 * nested object cannot hang the logger.
 */
export function redact(value: unknown, depth = 0): unknown {
  if (depth > 8) return "[depth limit]";
  if (typeof value === "string") return redactString(value);
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map((v) => redact(v, depth + 1));

  const out: Record<string, unknown> = {};
  for (const [key, v] of Object.entries(value as Record<string, unknown>)) {
    out[key] = SENSITIVE_KEY.test(key) ? REDACTED : redact(v, depth + 1);
  }
  return out;
}
