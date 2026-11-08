import { describe, expect, it } from "vitest";
import { REDACTED, redact } from "./redaction";

describe("log redaction", () => {
  it("removes values held under a sensitive key name", () => {
    const out = redact({ user: "naseem", password: "hunter2", apiKey: "abc" }) as Record<string, unknown>;
    expect(out["user"]).toBe("naseem");
    expect(out["password"]).toBe(REDACTED);
    expect(out["apiKey"]).toBe(REDACTED);
  });

  it("catches a credential hidden in an innocently named field", () => {
    const out = redact({ note: "my key is sk-ant-abcdefghijklmnop1234" }) as Record<string, unknown>;
    expect(out["note"]).toBe(`my key is ${REDACTED}`);
  });

  it("catches GitHub tokens, Google keys and JWTs", () => {
    const out = redact([
      "ghp_0123456789abcdefghij",
      "AIzaSyA0123456789abcdefghijklmnopqrstuv",
      "eyJhbGciOi.eyJzdWIiOi.SflKxwRJSM",
    ]) as string[];
    for (const v of out) expect(v).toBe(REDACTED);
  });

  it("walks nested structures", () => {
    const out = redact({ a: { b: [{ token: "x", safe: 1 }] } }) as
      { a: { b: Array<Record<string, unknown>> } };
    expect(out.a.b[0]?.["token"]).toBe(REDACTED);
    expect(out.a.b[0]?.["safe"]).toBe(1);
  });

  it("does not hang on a pathologically deep object", () => {
    let deep: Record<string, unknown> = { v: 1 };
    for (let i = 0; i < 40; i += 1) deep = { nested: deep };
    expect(() => redact(deep)).not.toThrow();
  });

  it("leaves ordinary values alone", () => {
    expect(redact({ count: 3, ok: true, name: "NN Life" }))
      .toEqual({ count: 3, ok: true, name: "NN Life" });
  });
});
