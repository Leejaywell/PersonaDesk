import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const scanLocalAgentsMock = vi.hoisted(() => vi.fn());

vi.mock("./app/localAgents", () => ({
  scanLocalAgents: scanLocalAgentsMock
}));

import App from "./App";

describe("PersonaDesk app", () => {
  beforeEach(() => {
    window.localStorage.clear();
    scanLocalAgentsMock.mockReset();
    scanLocalAgentsMock.mockResolvedValue({
      agents: [],
      message: "Local agent scan is available in the Tauri desktop runtime."
    });
  });

  it("shows product navigation and keeps management controls out of the desktop stage", async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(screen.getByText("PersonaDesk")).toBeInTheDocument();
    expect(screen.getByText("Desktop Stage")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Tasks/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Run autonomous task" })).not.toBeInTheDocument();
    expect(screen.queryByText("Executor Registry")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Executors/i }));

    expect(screen.getByText("Executor Registry")).toBeInTheDocument();
    expect(screen.getByText("Voice Providers")).toBeInTheDocument();
  });

  it("can scan and merge detected local agents from the executor page", async () => {
    const user = userEvent.setup();
    scanLocalAgentsMock.mockResolvedValue({
      agents: [{ id: "codex-cli", displayName: "Codex CLI", available: true, version: "codex 1.2.3" }],
      message: "Scanned 1 known local agent slot."
    });
    render(<App />);

    await user.click(screen.getByRole("button", { name: /Executors/i }));
    await user.click(screen.getByRole("button", { name: "Scan local agents" }));

    expect(await screen.findByText("Scanned 1 known local agent slot.")).toBeInTheDocument();
    expect(screen.getByText(/Detected locally \(codex 1.2.3\)/)).toBeInTheDocument();
    expect(scanLocalAgentsMock).toHaveBeenCalledTimes(1);
  });

  it("can run a local deterministic task from the UI", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: /Tasks/i }));
    await user.type(screen.getByLabelText("Task goal"), "Create a privacy checklist");
    await user.click(screen.getByRole("button", { name: "Run autonomous task" }));

    expect(await screen.findByText("Delivered")).toBeInTheDocument();
    expect(screen.getAllByText(/privacy checklist/i).length).toBeGreaterThan(0);
  });

  it("can review memory layer, owner, sensitivity, and sync policy before confirmation", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: /Tasks/i }));
    await user.type(screen.getByLabelText("Task goal"), "Create memory preference checklist");
    await user.click(screen.getByRole("button", { name: "Run autonomous task" }));
    expect(await screen.findByText("Delivered")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Memory/i }));
    await user.selectOptions(screen.getByLabelText("Layer"), "character-private");
    await user.selectOptions(screen.getByLabelText("Owner"), "mira");
    await user.selectOptions(screen.getByLabelText("Sensitivity"), "high");
    await user.click(screen.getByRole("button", { name: "Confirm reviewed memory" }));

    expect(screen.getByText("Confirmed memories: 1")).toBeInTheDocument();
    expect(screen.getAllByText("character-private").length).toBeGreaterThan(0);
    expect(screen.getByText("Mira")).toBeInTheDocument();
    expect(screen.getByText("high")).toBeInTheDocument();
    expect(screen.getByText("local-only")).toBeInTheDocument();
  });

  it("blocks risky tasks until requested scopes are granted on the same task", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: /Tasks/i }));
    await user.type(screen.getByLabelText("Task goal"), "Delete old files and publish the release");
    await user.click(screen.getByRole("button", { name: "Run autonomous task" }));

    expect(await screen.findByText("Blocked")).toBeInTheDocument();
    expect(screen.getByText(/The task appears to require destructive file operations/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Grant requested scopes and continue" }));

    expect(screen.getAllByText("Delivered").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Mode: unsupervised").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Scope: text-planning-only destructive-filesystem external-publishing").length).toBeGreaterThan(0);
  });

  it("can generate and confirm an honest character draft", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: /Characters/i }));
    await user.clear(screen.getByLabelText("Text import"));
    await user.type(screen.getByLabelText("Text import"), "A focused reviewer who checks privacy boundaries.");
    await user.upload(
      screen.getByLabelText("Optional image file"),
      new File(["avatar"], "reviewer.png", { type: "image/png" })
    );
    await user.click(screen.getByRole("button", { name: "Generate character draft" }));

    expect(screen.getByText("Image handling used file metadata only; no vision model is configured.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Confirm character" }));

    expect(screen.getAllByText("Vera").length).toBeGreaterThan(0);
  });

  it("can edit character relationship and boundary settings", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: /Characters/i }));
    await user.clear(screen.getByLabelText("Custom relationship"));
    await user.type(screen.getByLabelText("Custom relationship"), "A CEO spouse companion who remembers private context.");
    await user.selectOptions(screen.getByLabelText("Role boundary"), "boundary-quiet-observer");
    await user.click(screen.getByRole("button", { name: "Save character settings" }));

    expect(screen.getAllByText("A CEO spouse companion who remembers private context.").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Quiet observer").length).toBeGreaterThan(0);
  });

  it("records cloud vision approval from a local observation summary without uploading frames", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: /Privacy/i }));
    await user.click(screen.getByRole("button", { name: "Start observation" }));
    await user.type(screen.getByLabelText("Local summary"), "User reviewed a design document");
    await user.click(screen.getByRole("button", { name: "Add local summary" }));
    await user.click(screen.getByRole("button", { name: "Approve cloud vision review" }));

    expect(await screen.findByText(/no raw screen frame was uploaded/i)).toBeInTheDocument();
    expect(screen.getByText("Cloud vision approved")).toBeInTheDocument();
  });
});
