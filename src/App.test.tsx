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

  it("can generate and confirm an honest character draft", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.clear(screen.getByLabelText("Text import"));
    await user.type(screen.getByLabelText("Text import"), "A focused reviewer who checks privacy boundaries.");
    await user.upload(
      screen.getByLabelText("Optional image file"),
      new File(["avatar"], "reviewer.png", { type: "image/png" })
    );
    await user.click(screen.getByRole("button", { name: "Generate character draft" }));

    expect(screen.getByText("Image handling used file metadata only; no vision model is configured.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Confirm character" }));

    expect(screen.getByText("Vera")).toBeInTheDocument();
  });
});
