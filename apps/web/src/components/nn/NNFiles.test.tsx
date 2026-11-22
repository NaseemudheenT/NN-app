import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { RecordState } from "@/lib/nn/records";

/* The record layer is replaced so the test can put Files into each of the
   states it has to handle: reading, denied, genuinely empty, and holding
   documents. The layer's own behaviour is tested beside it in records.test. */
const state = vi.hoisted(() => ({
  // Annotated rather than inferred: the literal shape would pin `empty` to
  // true and `ready` to true, and every test here works by changing them.
  value: {
    items: [],
    loading: false,
    empty: true,
    stale: false,
    fault: null,
  } as RecordState,
  ready: true as boolean,
  create: vi.fn(async () => "new-id"),
}));

vi.mock("@/lib/nn/records", () => ({
  useRecords: () => state.value,
  useRecordWriter: () => ({
    ready: state.ready,
    create: state.create,
    update: vi.fn(), remove: vi.fn(), restore: vi.fn(), destroy: vi.fn(),
  }),
}));

const { NNFiles } = await import("./NNFiles");

function documents(...rows: { id: string; title: string; folder?: string; kind?: string; bytes?: number }[]) {
  state.value = { items: rows, loading: false, empty: rows.length === 0, stale: false, fault: null };
}

afterEach(cleanup);
beforeEach(() => {
  documents();
  state.ready = true;
  state.create.mockClear();
});

describe("Files", () => {
  it("shows no folders at all when there are no documents, and says why", () => {
    render(<NNFiles />);
    expect(screen.getByRole("heading", { level: 2, name: "No documents yet" })).toBeInTheDocument();
    // Inventing "Invoices" and "Moodboard" would be a lie about what is here.
    expect(screen.queryAllByRole("button", { name: /^Open / })).toHaveLength(0);
  });

  it("groups documents into one folder per folder name", () => {
    documents(
      { id: "a", title: "Contract", folder: "Business", kind: "pdf", bytes: 320_000 },
      { id: "b", title: "Invoice 14", folder: "Business", kind: "pdf" },
      { id: "c", title: "Shot list", folder: "Studio" },
    );
    render(<NNFiles />);
    expect(screen.getByRole("button", { name: /^Open Business, 2 documents/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Open Studio, 1 document$/ })).toBeInTheDocument();
  });

  it("files a document with no folder under Unfiled rather than dropping it", () => {
    documents({ id: "a", title: "Stray note" });
    render(<NNFiles />);
    expect(screen.getByRole("button", { name: /^Open Unfiled, 1 document$/ })).toBeInTheDocument();
  });

  it("keeps a closed folder's documents out of the tab order", () => {
    documents({ id: "a", title: "Contract", folder: "Business" });
    render(<NNFiles />);
    const contents = screen.getByRole("list", { name: "Business contents" });
    expect(contents).toHaveAttribute("inert");
  });

  it("opens a folder and shows each document as its own control", async () => {
    documents(
      { id: "a", title: "Contract", folder: "Business", kind: "pdf", bytes: 320_000 },
      { id: "b", title: "Invoice 14", folder: "Business" },
    );
    render(<NNFiles />);
    await userEvent.click(screen.getByRole("button", { name: /^Open Business/ }));

    const contents = screen.getByRole("list", { name: "Business contents" });
    expect(contents).not.toHaveAttribute("inert");
    expect(within(contents).getByRole("button", { name: /Contract/ })).toBeInTheDocument();
    expect(within(contents).getByRole("button", { name: /Invoice 14/ })).toBeInTheDocument();
  });

  it("shows four documents and still counts them all, so the preview hides nothing", () => {
    documents(
      ...Array.from({ length: 9 }, (_, i) => ({
        id: `d${i}`, title: `Document ${i}`, folder: "Studio",
      })),
    );
    render(<NNFiles />);
    const folder = screen.getByRole("button", { name: /^Open Studio, 9 documents$/ });
    expect(folder).toBeInTheDocument();
    const contents = screen.getByRole("list", { name: "Studio contents" });
    expect(within(contents).getAllByRole("listitem")).toHaveLength(4);
  });

  it("writes a real document when the key is pressed", async () => {
    documents({ id: "a", title: "Contract", folder: "Business" });
    render(<NNFiles />);
    await userEvent.click(screen.getByRole("button", { name: "Add a document to Business" }));
    expect(state.create).toHaveBeenCalledWith("documents", {
      title: "Untitled document", folder: "Business", kind: "note",
    });
  });

  it("says the write failed rather than showing a document that was never saved", async () => {
    documents({ id: "a", title: "Contract", folder: "Business" });
    state.create.mockRejectedValueOnce(new Error("Missing or insufficient permissions."));
    render(<NNFiles />);
    await userEvent.click(screen.getByRole("button", { name: "Add a document to Business" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Not added. Missing or insufficient permissions.",
    );
  });

  it("does not offer to add anything when it cannot write", () => {
    state.ready = false;
    render(<NNFiles />);
    expect(screen.getByRole("button", { name: /Add your first document/ })).toBeDisabled();
    expect(screen.getByText("Sign in to add documents.")).toBeInTheDocument();
  });

  it("explains a refused read in its own words", () => {
    state.value = {
      items: [], loading: false, empty: false, stale: false,
      fault: { kind: "signed-out", message: "Sign in to load your records." },
    };
    render(<NNFiles />);
    expect(screen.getByRole("status")).toHaveTextContent("Sign in to see your documents.");
  });
});
