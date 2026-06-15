import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import App from "./App";

describe("PersonaDesk app", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("shows emotional characters, task characters, and executor status", () => {
    render(<App />);

    expect(screen.getByText("PersonaDesk")).toBeInTheDocument();
    expect(screen.getByText("Emotional Characters")).toBeInTheDocument();
    expect(screen.getByText("Task Characters")).toBeInTheDocument();
    expect(screen.getByText("Executor Registry")).toBeInTheDocument();
  });

  it("can run a local deterministic task from the UI", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.type(screen.getByLabelText("Task goal"), "Create a privacy checklist");
    await user.click(screen.getByRole("button", { name: "Run autonomous task" }));

    expect(await screen.findByText("Delivered")).toBeInTheDocument();
    expect(screen.getAllByText(/privacy checklist/i).length).toBeGreaterThan(0);
  });
});
