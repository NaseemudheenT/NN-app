import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

vi.mock("@/components/auth/RequireOwner", () => ({
  RequireOwner: ({ children }: { children: ReactNode }) => <>{children}</>,
}));
vi.mock("@/lib/auth", () => ({ useAuth: () => ({ user: null }) }));
vi.mock("@/components/nn/NNDashboard", () => ({
  NNDashboard: () => <main><h1>NN Command Dashboard</h1><p>Today at a glance</p></main>,
}));

import NNHome from "./NNHome";

afterEach(cleanup);

describe("authenticated NN Home route", () => {
  it("opens the full dashboard while keeping the launcher as a separate preview", () => {
    render(<NNHome />);
    expect(screen.getByRole("heading", { name: "NN Command Dashboard" })).toBeInTheDocument();
    expect(screen.queryByRole("searchbox", { name: "Search applications" })).toBeNull();
  });
});
