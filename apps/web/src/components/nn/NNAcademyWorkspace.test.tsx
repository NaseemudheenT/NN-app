import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
const { useRecords } = vi.hoisted(() => ({ useRecords: vi.fn() }));
vi.mock("@/lib/nn/records", () => ({ useRecords }));
vi.mock("@/components/nn/NNAppSurface", () => ({ NNAppSurface: () => <div>Editable learning records</div> }));
const { NNAcademyWorkspace } = await import("./NNAcademyWorkspace");
const app = { id: "academy", name: "Academy", group: "Education", description: "Learning space" } as never;
const sections = [] as never;
const state = (items: object[]) => ({ items, loading: false, empty: !items.length, stale: false, fault: null });
afterEach(cleanup);
beforeEach(() => useRecords.mockImplementation((collection: string) => state(collection === "academy_paths" ? [] : [])));
describe("NN Academy workspace", () => {
  it("shows useful empty states and the editable learning desk", () => {
    render(<NNAcademyWorkspace app={app} sections={sections} />);
    expect(screen.getByRole("heading", { name: /Academy/ })).toBeInTheDocument();
    expect(screen.getByText("Your first learning path starts here.")).toBeInTheDocument();
    expect(screen.getByText("Editable learning records")).toBeInTheDocument();
  });
  it("summarises learning paths and recent study records", () => {
    useRecords.mockImplementation((collection: string) => collection === "academy_paths"
      ? state([{ id: "p1", title: "Computer Science", status: "in progress" }, { id: "p2", title: "English", status: "done" }])
      : state([{ id: "l1", title: "C pointers", source: "C programming", at: new Date("2026-11-20") }]));
    render(<NNAcademyWorkspace app={app} sections={sections} />);
    expect(screen.getByText("Computer Science")).toBeInTheDocument();
    expect(screen.getByText("C pointers")).toBeInTheDocument();
    expect(screen.getByText("C programming")).toBeInTheDocument();
    expect(screen.getByText("1 of 2 paths completed")).toBeInTheDocumen...[truncated]