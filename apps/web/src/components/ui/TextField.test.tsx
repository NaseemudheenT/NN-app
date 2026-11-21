import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { TextField } from "./TextField";

afterEach(cleanup);

describe("TextField", () => {
  it("connects its label and hint to the input", () => {
    render(<TextField label="Email address" hint="Use your account email." />);
    const field = screen.getByRole("textbox", { name: "Email address" });
    const describedBy = field.getAttribute("aria-describedby");
    expect(describedBy).toBeTruthy();
    expect(document.getElementById(describedBy!)).toHaveTextContent("Use your account email.");
    expect(field).toHaveAttribute("aria-invalid", "false");
  });

  it("references only the error that is actually rendered", () => {
    render(<TextField label="Email address" hint="Use your account email." error="Enter a valid email." />);
    const field = screen.getByRole("textbox", { name: "Email address" });
    const describedBy = field.getAttribute("aria-describedby");
    expect(field).toHaveAttribute("aria-invalid", "true");
    expect(document.getElementById(describedBy!)).toHaveTextContent("Enter a valid email.");
    expect(screen.queryByText("Use your account email.")).toBeNull();
    expect(screen.getByRole("alert")).toHaveTextContent("Enter a valid email.");
  });

  it("renders a labelled multiline field as a textarea", () => {
    render(<TextField label="Notes" multiline />);
    expect(screen.getByRole("textbox", { name: "Notes" }).tagName).toBe("TEXTAREA");
  });
});
