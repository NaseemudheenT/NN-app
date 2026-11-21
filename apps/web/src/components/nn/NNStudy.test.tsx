import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NNStudy } from "./NNStudy";

const mocks = vi.hoisted(() => ({
  addDoc: vi.fn(),
  collection: vi.fn(() => "subjects-collection"),
  limit: vi.fn(() => "limit-40"),
  onSnapshot: vi.fn(),
  orderBy: vi.fn(() => "updated-desc"),
  query: vi.fn(() => "subjects-query"),
  serverTimestamp: vi.fn(() => "server-timestamp"),
  firebaseAvailable: vi.fn(() => true),
  getFirebase: vi.fn(() => ({ db: {} })),
}));

vi.mock("firebase/firestore", () => ({
  addDoc: mocks.addDoc,
  collection: mocks.collection,
  limit: mocks.limit,
  onSnapshot: mocks.onSnapshot,
  orderBy: mocks.orderBy,
  query: mocks.query,
  serverTimestamp: mocks.serverTimestamp,
}));

vi.mock("@/lib/firebase", () => ({
  firebaseAvailable: mocks.firebaseAvailable,
  getFirebase: mocks.getFirebase,
}));

vi.mock("@/lib/auth", () => ({
  useAuth: () => ({ user: { uid: "owner-uid" } }),
}));

describe("NN Study", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.firebaseAvailable.mockReturnValue(true);
    mocks.onSnapshot.mockImplementation((_query, onNext) => {
      onNext({ docs: [] });
      return vi.fn();
    });
    mocks.addDoc.mockResolvedValue({ id: "new-subject" });
  });

  afterEach(() => cleanup());

  it("loads a bounded subject query for the authenticated owner", async () => {
    render(<NNStudy />);
    expect(await screen.findByText("Your study space is ready.")).toBeInTheDocument();
    expect(mocks.collection).toHaveBeenCalledWith({}, "users", "owner-uid", "subjects");
    expect(mocks.limit).toHaveBeenCalledWith(40);
    expect(mocks.orderBy).toHaveBeenCalledWith("updatedAt", "desc");
  });

  it("creates a subject with the required schema metadata", async () => {
    const user = userEvent.setup();
    render(<NNStudy />);
    await screen.findByText("Your study space is ready.");
    await user.type(screen.getByLabelText("Subject name"), "Engineering Mathematics");
    await user.type(screen.getByLabelText(/Subject code/), "MA101");
    await user.selectOptions(screen.getByLabelText("Semester"), "1");
    await user.click(screen.getByRole("button", { name: "Add subject" }));

    await waitFor(() => expect(mocks.addDoc).toHaveBeenCalledWith(
      "subjects-collection",
      expect.objectContaining({
        name: "Engineering Mathematics",
        code: "MA101",
        semester: 1,
        createdAt: "server-timestamp",
        updatedAt: "server-timestamp",
        schemaVersion: 1,
      }),
    ));
  });

  it("filters the real subject list by search and semester", async () => {
    const user = userEvent.setup();
    mocks.onSnapshot.mockImplementation((_query, onNext) => {
      onNext({
        docs: [
          { id: "ma", data: () => ({ name: "Engineering Mathematics", code: "MA101", semester: 1 }) },
          { id: "pc", data: () => ({ name: "Programming in C", code: "CS101", semester: 1 }) },
          { id: "be", data: () => ({ name: "Basic Electrical", code: "EE101", semester: 2 }) },
        ],
      });
      return vi.fn();
    });
    render(<NNStudy />);
    expect(await screen.findByText("Engineering Mathematics")).toBeInTheDocument();
    await user.type(screen.getByRole("textbox", { name: "Search subjects" }), "programming");
    expect(screen.getByText("Programming in C")).toBeInTheDocument();
    expect(screen.queryByText("Engineering Mathematics")).not.toBeInTheDocument();
    await user.clear(screen.getByRole("textbox", { name: "Search subjects" }));
    await user.selectOptions(screen.getByLabelText("Filter by semester"), "2");
    expect(screen.getByText("Basic Electrical")).toBeInTheDocument();
    expect(screen.queryByText("Programming in C")).not.toBeInTheDocument();
  });
});
