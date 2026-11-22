import { renderHook, act, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";

/* The firestore module is replaced wholesale: these tests are about what NN
   asks Firestore to do, not about Firestore. Every call is captured so the
   path, the payload and the refusals can be asserted exactly. */
const calls: { fn: string; args: unknown[] }[] = [];
const record = (fn: string) => (...args: unknown[]) => { calls.push({ fn, args }); return { fn, args }; };

let snapshotHandler: ((snap: unknown) => void) | null = null;
let errorHandler: ((err: unknown) => void) | null = null;

vi.mock("firebase/firestore", () => ({
  addDoc: vi.fn(async (...a: unknown[]) => { calls.push({ fn: "addDoc", args: a }); return { id: "new-id" }; }),
  updateDoc: vi.fn(async (...a: unknown[]) => { calls.push({ fn: "updateDoc", args: a }); }),
  setDoc: vi.fn(async (...a: unknown[]) => { calls.push({ fn: "setDoc", args: a }); }),
  deleteDoc: vi.fn(async (...a: unknown[]) => { calls.push({ fn: "deleteDoc", args: a }); }),
  collection: vi.fn((_db: unknown, path: string) => { calls.push({ fn: "collection", args: [path] }); return { path }; }),
  doc: vi.fn((_db: unknown, path: string) => { calls.push({ fn: "doc", args: [path] }); return { path }; }),
  query: record("query"),
  orderBy: record("orderBy"),
  where: record("where"),
  limit: record("limit"),
  onSnapshot: vi.fn((_q: unknown, onNext: (s: unknown) => void, onError: (e: unknown) => void) => {
    snapshotHandler = onNext; errorHandler = onError;
    return () => { snapshotHandler = null; errorHandler = null; };
  }),
  serverTimestamp: () => "SERVER_TIME",
}));

let signedIn = true;
let configured = true;
vi.mock("@/lib/auth", () => ({ useAuth: () => ({ user: signedIn ? { uid: "owner-1" } : null }) }));
vi.mock("@/lib/firebase", () => ({
  firebaseAvailable: () => configured,
  getFirebase: () => ({ db: {} }),
}));

const { useRecords, useRecordWriter } = await import("./records");

const snapshot = (docs: { id: string; data: Record<string, unknown> }[], fromCache = false) => ({
  docs: docs.map((d) => ({ id: d.id, data: () => d.data })),
  metadata: { fromCache },
});

beforeEach(() => {
  calls.length = 0;
  signedIn = true;
  configured = true;
});

describe("useRecords", () => {
  it("reads through the typed path builder, never a hand-written string", async () => {
    renderHook(() => useRecords("tasks"));
    await waitFor(() => expect(calls.some((c) => c.fn === "collection")).toBe(true));
    const path = calls.find((c) => c.fn === "collection")!.args[0];
    expect(path).toBe("users/owner-1/tasks");
  });

  it("bounds every read, so a phone never pulls an unbounded collection", async () => {
    renderHook(() => useRecords("notes"));
    await waitFor(() => expect(calls.some((c) => c.fn === "limit")).toBe(true));
    expect(calls.find((c) => c.fn === "limit")!.args[0]).toBe(100);
  });

  it("reports empty as a real state, distinct from loading and from failure", async () => {
    const { result } = renderHook(() => useRecords("goals"));
    expect(result.current.loading).toBe(true);
    act(() => snapshotHandler?.(snapshot([])));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.empty).toBe(true);
    expect(result.current.fault).toBeNull();
    expect(result.current.items).toEqual([]);
  });

  it("says plainly when data came only from the cache", async () => {
    const { result } = renderHook(() => useRecords("tasks"));
    act(() => snapshotHandler?.(snapshot([{ id: "a", data: { title: "Write" } }], true)));
    await waitFor(() => expect(result.current.stale).toBe(true));
    expect(result.current.items).toEqual([{ id: "a", title: "Write" }]);
  });

  it("hides trashed records unless they are asked for", async () => {
    const { result } = renderHook(() => useRecords("notes"));
    act(() => snapshotHandler?.(snapshot([
      { id: "live", data: { title: "Kept" } },
      { id: "gone", data: { title: "Trashed", deletedAt: "SERVER_TIME" } },
    ])));
    await waitFor(() => expect(result.current.items).toHaveLength(1));
    expect(result.current.items[0]!.id).toBe("live");
  });

  it("distinguishes a refusal from a failure, because they need different words", async () => {
    const { result } = renderHook(() => useRecords("tasks"));
    act(() => errorHandler?.({ code: "permission-denied" }));
    await waitFor(() => expect(result.current.fault?.kind).toBe("denied"));

    const second = renderHook(() => useRecords("tasks"));
    act(() => errorHandler?.({ code: "unavailable" }));
    await waitFor(() => expect(second.result.current.fault?.kind).toBe("unavailable"));
  });

  it("does not pretend to load anything when nobody is signed in", async () => {
    signedIn = false;
    const { result } = renderHook(() => useRecords("tasks"));
    await waitFor(() => expect(result.current.fault?.kind).toBe("signed-out"));
    expect(result.current.loading).toBe(false);
    expect(calls.some((c) => c.fn === "onSnapshot")).toBe(false);
  });

  it("says so when the environment has no Firebase at all", async () => {
    configured = false;
    const { result } = renderHook(() => useRecords("tasks"));
    await waitFor(() => expect(result.current.fault?.kind).toBe("unconfigured"));
  });
});

describe("useRecordWriter", () => {
  it("stamps provenance on a new record and writes to the built path", async () => {
    const { result } = renderHook(() => useRecordWriter());
    await act(async () => { await result.current.create("tasks", { title: "Ship NN" }); });

    const add = calls.find((c) => c.fn === "addDoc")!;
    expect((add.args[0] as { path: string }).path).toBe("users/owner-1/tasks");
    expect(add.args[1]).toMatchObject({
      title: "Ship NN",
      createdAt: "SERVER_TIME",
      updatedAt: "SERVER_TIME",
      schemaVersion: 1,
    });
  });

  it("never sends createdAt on an update — the rules reject a write that changes it", async () => {
    const { result } = renderHook(() => useRecordWriter());
    await act(async () => { await result.current.update("tasks", "t1", { title: "Renamed" }); });

    const payload = calls.find((c) => c.fn === "updateDoc")!.args[1] as Record<string, unknown>;
    expect(payload).toMatchObject({ title: "Renamed", updatedAt: "SERVER_TIME" });
    expect(payload).not.toHaveProperty("createdAt");
  });

  it("deletes softly by default, so nothing is lost to a mis-tap", async () => {
    const { result } = renderHook(() => useRecordWriter());
    await act(async () => { await result.current.remove("notes", "n1"); });

    expect(calls.some((c) => c.fn === "deleteDoc")).toBe(false);
    expect(calls.find((c) => c.fn === "updateDoc")!.args[1]).toMatchObject({ deletedAt: "SERVER_TIME" });
  });

  it("hard-deletes only when explicitly told to", async () => {
    const { result } = renderHook(() => useRecordWriter());
    await act(async () => { await result.current.destroy("notes", "n1"); });
    expect(calls.some((c) => c.fn === "deleteDoc")).toBe(true);
  });

  it("refuses to write a server-owned collection, and says why", async () => {
    const { result } = renderHook(() => useRecordWriter());
    for (const owned of ["audit_logs", "permissions", "credentials", "tool_executions"]) {
      await expect(result.current.create(owned, { x: 1 })).rejects.toThrow(/written by NN's server/);
    }
    expect(calls.some((c) => c.fn === "addDoc")).toBe(false);
  });

  it("refuses to write a record it cannot attribute to an owner", async () => {
    signedIn = false;
    const { result } = renderHook(() => useRecordWriter());
    await expect(result.current.create("tasks", { title: "x" })).rejects.toThrow(/cannot attribute/);
    expect(result.current.ready).toBe(false);
  });
});
