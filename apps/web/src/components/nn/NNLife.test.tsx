import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NNLife } from "./NNLife";

const mocks = vi.hoisted(() => ({
  addDoc: vi.fn(),
  collection: vi.fn(() => "tasks-collection"),
  doc: vi.fn(() => "task-document"),
  limit: vi.fn(() => "limit-50"),
  onSnapshot: vi.fn(),
  orderBy: vi.fn(() => "updated-desc"),
  query: vi.fn(() => "tasks-query"),
  serverTimestamp: vi.fn(() => "server-timestamp"),
  updateDoc: vi.fn(),
  firebaseAvailable: vi.fn(() => true),
  getFirebase: vi.fn(() => ({ db: {} })),
}));

vi.mock("firebase/firestore", () => ({
  addDoc: mocks.addDoc,
  collection: mocks.collection,
  doc: mocks.doc,
  limit: mocks.limit,
  onSnapshot: mocks.onSnapshot,
  orderBy: mocks.orderBy,
  query: mocks.query,
  serverTimestamp: mocks.serverTimestamp,
  updateDoc: mocks.updateDoc,
}));

vi.mock("@/lib/firebase", () => ({
  firebaseAvailable: mocks.firebaseAvailable,
  getFirebase: mocks.getFirebase,
}));

vi.mock("@/lib/auth", () => ({
  useAuth: () => ({ user: { uid: "owner-uid" } }),
}));

describe("NN Life", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.firebaseAvailable.mockReturnValue(true);
    mocks.onSnapshot.mockImplementation((_query, onNext) => {
      onNext({ docs: [] });
      return vi.fn();
    });
    mocks.addDoc.mockResolvedValue({ id: "new-task" });
    mocks.updateDoc.mockResolvedValue(undefined);
  });

  afterEach(() => cleanup());

  it("loads a bounded task query for the authenticated owner", async () => {
    render(<NNLife />);
    expect(await screen.findByText("Nothing waiting on you.")).toBeInTheDocument();
    expect(mocks.collection).toHaveBeenCalledWith({}, "users", "owner-uid", "tasks");
    expect(mocks.limit).toHaveBeenCalledWith(50);
    expect(mocks.orderBy).toHaveBeenCalledWith("updatedAt", "desc");
  });

  it("creates a task with the required schema metadata", async () => {
    const user = userEvent.setup();
    render(<NNLife />);
    await screen.findByText("Nothing waiting on you.");
    await user.type(screen.getByLabelText("New task"), "Review C programming");
    await user.click(screen.getByRole("button", { name: /^Add$/ }));

    await waitFor(() => expect(mocks.addDoc).toHaveBeenCalledWith(
      "tasks-collection",
      expect.objectContaining({
        title: "Review C programming",
        status: "open",
        priority: "normal",
        createdAt: "server-timestamp",
        updatedAt: "server-timestamp",
        schemaVersion: 1,
      }),
    ));
  });

  it("completes and reopens an existing task", async () => {
    const user = userEvent.setup();
    mocks.onSnapshot.mockImplementation((_query, onNext) => {
      onNext({
        docs: [{
          id: "task-1",
          data: () => ({ title: "Finish matrices", status: "open", priority: "high", dueAt: null }),
        }],
      });
      return vi.fn();
    });

    render(<NNLife />);
    expect(await screen.findByText("Finish matrices")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Complete Finish matrices" }));
    await waitFor(() => expect(mocks.updateDoc).toHaveBeenCalledWith(
      "task-document",
      expect.objectContaining({ status: "done", updatedAt: "server-timestamp" }),
    ));
  });
});
