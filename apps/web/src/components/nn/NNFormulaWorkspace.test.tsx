import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
const { useRecords } = vi.hoisted(() => ({ useRecords: vi.fn() }));
vi.mock("@/lib/nn/records", () => ({ useRecords }));
vi.mock("@/components/nn/NNAppSurface", () => ({ NNAppSurface: () => <div>Formula records</div> }));
const { NNFormulaWorkspace } = await import("./NNFormulaWorkspace");
const app = { id: "formula-engine", name: "Formula Engine" } as never;
const state = (items: object[]) => ({ items, loading: false, empty: !items.length, stale: false, fault: null });
afterEach(cleanup);
beforeEach(() => useRecords.mockReturnValue(state([])));
describe("NN Formula Engine", () => {
  it("shows an honest empty library and record manager", () => {
    render(<NNFormulaWorkspace app={app} sections={[] as never}/>);
    expect(screen.getByRole("heading", { name: /Formula/ })).toBeInTheDocument();
    expect(screen.getByText("Your formula library is ready.")).toBeInTheDocument();
    expect(screen.getByText("Formula records")).toBeInTheDocument();
  });
  it("filters saved formulas by title, expression and units", () => {
    useRecords.mockReturnValue(state([{id:"f1",title:"Simple interest",expression:"P × R × T / 100",units:"rupees"},{id:"f2",title:"Speed",expression:"distance / time",units:"m/s"}]));
    render(<NNFormulaWorkspace app={app} sections={[] as never}/>);
    fireEvent.change(screen.getByRole("textbox",{name:"Search formulas"}),{target:{value:"rupees"}});
    expect(screen.getByText("Simple interest")).toBeInTheDocument();
    expect(screen.queryByText("Speed")).not.toBeInTheDocument();
  });
});
