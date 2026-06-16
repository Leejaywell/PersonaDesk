import "@testing-library/jest-dom/vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const scanLocalAgentsMock = vi.hoisted(() => vi.fn());
const captureRuntimeScreenObservationMock = vi.hoisted(() => vi.fn());

vi.mock("./app/localAgents", () => ({
  scanLocalAgents: scanLocalAgentsMock
}));

vi.mock("./app/screenObservation", () => ({
  captureRuntimeScreenObservation: captureRuntimeScreenObservationMock
}));

import App from "./App";

describe("PersonaDesk app", () => {
  beforeEach(() => {
    window.history.pushState({}, "", "/");
    window.localStorage.clear();
    Object.defineProperty(window, "speechSynthesis", { value: undefined, configurable: true });
    Object.defineProperty(window, "SpeechSynthesisUtterance", { value: undefined, configurable: true });
    Object.defineProperty(window, "SpeechRecognition", { value: undefined, configurable: true });
    Object.defineProperty(window, "webkitSpeechRecognition", { value: undefined, configurable: true });
    scanLocalAgentsMock.mockReset();
    scanLocalAgentsMock.mockResolvedValue({
      agents: [],
      message: "Local agent scan is available in the Tauri desktop runtime."
    });
    captureRuntimeScreenObservationMock.mockReset();
    captureRuntimeScreenObservationMock.mockResolvedValue({
      status: "unavailable",
      appName: "Screen Capture",
      summary: "",
      disclosure: "Runtime screen capture is not available in this browser or WebView. No screen capture was attempted.",
      frameWidth: null,
      frameHeight: null
    });
  });

  it("shows product navigation and keeps management controls out of the desktop stage", async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(screen.getByRole("heading", { name: "PersonaDesk", level: 1 })).toBeInTheDocument();
    expect(screen.getByText("Desktop Stage")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Tasks/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Run autonomous task" })).not.toBeInTheDocument();
    expect(screen.queryByText("Executor Registry")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Executors/i }));

    expect(screen.getByText("Executor Registry")).toBeInTheDocument();
    expect(screen.getByText("Voice Providers")).toBeInTheDocument();
  });

  it("shows the native companion window plan on the desktop stage", () => {
    render(<App />);

    expect(screen.getByText("Native Surfaces")).toBeInTheDocument();
    expect(screen.getByText("PersonaDesk Companion")).toBeInTheDocument();
    expect(screen.getByText(/companion \/ floating-companion \/ 280x360/)).toBeInTheDocument();
    expect(screen.getByText("Always on top")).toBeInTheDocument();
    expect(screen.getByText("Decorations: off")).toBeInTheDocument();
    expect(screen.getByText("Taskbar: hidden")).toBeInTheDocument();
  });

  it("shows native presence contracts and records local notification preview audits", async () => {
    const user = userEvent.setup();
    Object.defineProperty(window, "Notification", { value: undefined, configurable: true });
    render(<App />);

    expect(screen.getByText("Native Presence")).toBeInTheDocument();
    expect(screen.getByText("Tray Menu")).toBeInTheDocument();
    expect(screen.getByText("Show or hide companion")).toBeInTheDocument();
    expect(screen.getByText("Task delivered")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Preview local desktop notification" }));

    const desktopPresenceAudit = screen.getByLabelText("Desktop presence audit");
    expect(within(desktopPresenceAudit).getByText("PersonaDesk companion is standing by")).toBeInTheDocument();
    expect(within(desktopPresenceAudit).getByText("Unavailable")).toBeInTheDocument();
    expect(within(desktopPresenceAudit).getByText(/does not expose Web Notification/i)).toBeInTheDocument();
  });

  it("renders the compact companion surface without management navigation", () => {
    window.history.pushState({}, "", "/?surface=companion");

    render(<App />);

    expect(screen.getByRole("main", { name: "PersonaDesk companion window" })).toBeInTheDocument();
    expect(screen.getByText("Mira")).toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: "Product sections" })).not.toBeInTheDocument();
    expect(screen.queryByText("Executor Registry")).not.toBeInTheDocument();
  });

  it("can exchange local deterministic companion messages on the desktop stage", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.type(screen.getByLabelText("Message"), "Can you stay with me while I review this?");
    await user.click(screen.getByRole("button", { name: "Send local companion message" }));

    expect(screen.getByText("Can you stay with me while I review this?")).toBeInTheDocument();
    expect(screen.getByText(/No model provider was called/)).toBeInTheDocument();
  });

  it("can review companion-proposed memory before long-term write", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.type(screen.getByLabelText("Message"), "Please remember that I prefer quiet summaries.");
    await user.click(screen.getByRole("button", { name: "Send local companion message" }));
    await user.click(screen.getByRole("button", { name: /Memory/i }));

    expect(screen.getByDisplayValue("Please remember that I prefer quiet summaries.")).toBeInTheDocument();
    expect(screen.getByText(/Companion identified a relationship or preference note/i)).toBeInTheDocument();
    expect(screen.getByLabelText("Layer")).toHaveValue("character-private");
    expect(screen.getByLabelText("Owner")).toHaveValue("mira");
    await user.click(screen.getByRole("button", { name: "Confirm reviewed memory" }));

    const confirmedMemoryPanel = screen.getByRole("region", { name: "Confirmed Memory" });
    expect(within(confirmedMemoryPanel).getByText("Confirmed memories: 1")).toBeInTheDocument();
    expect(within(confirmedMemoryPanel).getByText("Mira")).toBeInTheDocument();
    expect(within(confirmedMemoryPanel).getByText("Please remember that I prefer quiet summaries.")).toBeInTheDocument();
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

  it("can save executor provider metadata without marking it available", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: /Executors/i }));
    await user.type(
      screen.getByLabelText("OpenAI-compatible chat API endpoint / base URL"),
      "https://api.example.test/v1"
    );
    await user.type(screen.getByLabelText("OpenAI-compatible chat API model / voice"), "gpt-compatible");
    await user.click(screen.getByRole("button", { name: "Save OpenAI-compatible chat API configuration" }));

    expect(screen.getAllByText("Configured").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/does not store raw secrets/).length).toBeGreaterThan(0);
    await user.click(screen.getByRole("button", { name: "Check OpenAI-compatible chat API" }));

    const healthAudit = screen.getByLabelText("Executor health audit");
    expect(within(healthAudit).getByText("OpenAI-compatible chat API")).toBeInTheDocument();
    expect(within(healthAudit).getByText("Configured Not Verified")).toBeInTheDocument();
    expect(within(healthAudit).getByText(/do not contact external services/i)).toBeInTheDocument();
  });

  it("records voice requests as local audit entries without capturing audio", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: /Executors/i }));
    await user.type(screen.getByLabelText("Voice request text"), "Please transcribe this local note.");
    await user.click(screen.getByRole("button", { name: "Record voice request" }));

    expect(screen.getAllByText("ASR transcript request").length).toBeGreaterThan(0);
    expect(screen.getByText("Please transcribe this local note.")).toBeInTheDocument();
    expect(screen.getByText(/no microphone audio was captured automatically/i)).toBeInTheDocument();
    expect(screen.getByText("Route: audit-only")).toBeInTheDocument();
    expect(screen.getByText("Source: manual-text")).toBeInTheDocument();
  });

  it("captures a runtime speech transcript into the ASR audit flow", async () => {
    const user = userEvent.setup();
    class FakeSpeechRecognition {
      continuous = false;
      interimResults = false;
      lang = "";
      maxAlternatives = 0;
      onresult: ((event: { results: Array<Array<{ transcript: string }>> }) => void) | null = null;
      onerror: ((event: { error: string }) => void) | null = null;
      onend: (() => void) | null = null;

      start() {
        this.onresult?.({ results: [[{ transcript: "Create a spoken runtime checklist" }]] });
      }

      stop() {}
    }
    Object.defineProperty(window, "SpeechRecognition", {
      value: FakeSpeechRecognition,
      configurable: true
    });
    render(<App />);

    await user.click(screen.getByRole("button", { name: /Executors/i }));
    expect(screen.getByLabelText("Voice provider")).toHaveValue("browser-asr");
    await user.click(screen.getByRole("button", { name: "Capture runtime speech transcript" }));

    expect(screen.getByLabelText("Voice request text")).toHaveValue("Create a spoken runtime checklist");
    expect(screen.getByText(/Runtime speech recognition returned a transcript/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Record voice request" }));

    expect(screen.getAllByText("ASR transcript request").length).toBeGreaterThan(0);
    expect(screen.getByText("Create a spoken runtime checklist")).toBeInTheDocument();
    expect(screen.getByText("Source: runtime-speech-recognition")).toBeInTheDocument();
    expect(screen.getAllByText(/does not store raw audio/i).length).toBeGreaterThan(0);
  });

  it("plays TTS preview text through local browser speech synthesis when available", async () => {
    const user = userEvent.setup();
    class FakeSpeechSynthesisUtterance {
      onend: (() => void) | null = null;
      onerror: (() => void) | null = null;
      onstart: (() => void) | null = null;

      constructor(public text: string) {}
    }
    const speak = vi.fn((utterance: FakeSpeechSynthesisUtterance) => {
      utterance.onstart?.();
    });
    Object.defineProperty(window, "SpeechSynthesisUtterance", {
      value: FakeSpeechSynthesisUtterance,
      configurable: true
    });
    Object.defineProperty(window, "speechSynthesis", {
      value: {
        cancel: vi.fn(),
        pending: false,
        speak,
        speaking: false
      },
      configurable: true
    });
    render(<App />);

    await user.click(screen.getByRole("button", { name: /Executors/i }));
    await user.selectOptions(screen.getByLabelText("Voice request kind"), "tts-preview");
    expect(screen.getByLabelText("Voice provider")).toHaveValue("browser-tts");
    await user.type(screen.getByLabelText("Voice request text"), "Read this through local speech.");
    await user.click(screen.getByRole("button", { name: "Record voice request" }));

    expect(screen.getByText("Read this through local speech.")).toBeInTheDocument();
    expect(screen.getByText("Not Requested")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Play local speech preview" }));

    expect(speak).toHaveBeenCalledTimes(1);
    expect(await screen.findByText("Played")).toBeInTheDocument();
    expect(screen.getByText(/No cloud voice provider was called/i)).toBeInTheDocument();
  });

  it("routes ASR transcript text to companion chat", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: /Executors/i }));
    await user.selectOptions(screen.getByLabelText("ASR transcript route"), "companion");
    await user.selectOptions(screen.getByLabelText("Transcript companion"), "mira");
    await user.type(screen.getByLabelText("Voice request text"), "Can you stay with this transcript?");
    await user.click(screen.getByRole("button", { name: "Record voice request" }));
    await user.click(screen.getByRole("button", { name: /Desktop/i }));

    expect(screen.getByText("Can you stay with this transcript?")).toBeInTheDocument();
    expect(screen.getByText(/local transcript text/)).toBeInTheDocument();
  });

  it("routes ASR transcript text into the task goal draft", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: /Executors/i }));
    await user.selectOptions(screen.getByLabelText("ASR transcript route"), "task-goal");
    await user.type(screen.getByLabelText("Voice request text"), "Create a voice-routed checklist");
    await user.click(screen.getByRole("button", { name: "Record voice request" }));
    await user.click(screen.getByRole("button", { name: /Tasks/i }));

    expect(screen.getByLabelText("Task goal")).toHaveValue("Create a voice-routed checklist");
  });

  it("can run a local deterministic task from the UI", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: /Tasks/i }));
    await user.type(screen.getByLabelText("Task goal"), "Create a privacy checklist");
    await user.click(screen.getByRole("button", { name: "Run autonomous task" }));

    expect(await screen.findByText("Delivered")).toBeInTheDocument();
    expect(screen.getAllByText(/privacy checklist/i).length).toBeGreaterThan(0);
    expect(screen.getByText("Dispatch: local-deterministic")).toBeInTheDocument();
    expect(screen.getByText(/Produced one local deterministic planning artifact/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Desktop/i }));
    expect(screen.getByText(/land as delivered/)).toBeInTheDocument();
    expect(screen.getByText(/No model provider was called/)).toBeInTheDocument();
  });

  it("expands and collapses the desktop task stage around the latest run", async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(screen.getByText("Mode: collapsed")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Expand task stage" })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: /Tasks/i }));
    await user.type(screen.getByLabelText("Task goal"), "Create a stage visibility checklist");
    await user.click(screen.getByRole("button", { name: "Run autonomous task" }));
    expect(await screen.findByText("Delivered")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Desktop/i }));
    expect(screen.getByText("Mode: expanded")).toBeInTheDocument();
    expect(screen.getByText(/Delivered a validated local planning artifact/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Collapse task stage" }));
    expect(screen.getByText("Mode: collapsed")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Expand task stage" }));
    expect(screen.getByText("Mode: expanded")).toBeInTheDocument();
  });

  it("can authorize task runs to use local observation summaries", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: /Privacy/i }));
    await user.click(screen.getByRole("button", { name: "Start observation" }));
    await user.type(screen.getByLabelText("Local summary"), "User compared launch checklist examples");
    await user.click(screen.getByRole("button", { name: "Add local summary" }));

    await user.click(screen.getByRole("button", { name: /Tasks/i }));
    await user.selectOptions(screen.getByLabelText("Authorization scope"), "text-planning-only observation-summaries");
    await user.type(screen.getByLabelText("Task goal"), "Create an observation-aware checklist");
    await user.click(screen.getByRole("button", { name: "Run autonomous task" }));

    expect(await screen.findByText("Delivered")).toBeInTheDocument();
    expect(screen.getByText(/Authorized observation summaries:/)).toBeInTheDocument();
    expect(screen.getByText(/Safari: User compared launch checklist examples/)).toBeInTheDocument();
    expect(screen.getByText("Scope: text-planning-only observation-summaries")).toBeInTheDocument();
  });

  it("lets the user accept a delivered task result", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: /Tasks/i }));
    await user.type(screen.getByLabelText("Task goal"), "Create an acceptance checklist");
    await user.click(screen.getByRole("button", { name: "Run autonomous task" }));

    expect(await screen.findByText("Awaiting final user acceptance.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Accept deliverable" }));

    expect(screen.getByText("User accepted this deliverable.")).toBeInTheDocument();
    expect(screen.getByText("Task status: accepted")).toBeInTheDocument();
    expect(screen.getByText("Accepted")).toBeInTheDocument();
  });

  it("can request a revision and produce a revised task run", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: /Tasks/i }));
    await user.type(screen.getByLabelText("Task goal"), "Create a revision checklist");
    await user.click(screen.getByRole("button", { name: "Run autonomous task" }));

    expect(await screen.findByText("Awaiting final user acceptance.")).toBeInTheDocument();
    await user.type(screen.getByLabelText("Revision request note"), "Needs a clearer testing section.");
    await user.click(screen.getByRole("button", { name: "Request revision" }));

    expect(screen.getByText("Task status: revision-requested")).toBeInTheDocument();
    expect(screen.getByText("Needs a clearer testing section.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Run revision" }));

    expect(screen.getByText("Delivered a revised local planning artifact.")).toBeInTheDocument();
    expect(screen.getByText("Awaiting final user acceptance for the revised delivery.")).toBeInTheDocument();
    expect(screen.getByText(/Revision feedback addressed: Needs a clearer testing section/)).toBeInTheDocument();
  });

  it("blocks task execution when the allowed executor list has no available provider", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: /Tasks/i }));
    await user.click(screen.getByLabelText(/Allow Local deterministic planner/i));
    await user.click(screen.getByLabelText(/Allow OpenAI-compatible chat API/i));
    await user.type(screen.getByLabelText("Task goal"), "Create an external model only checklist");
    await user.click(screen.getByRole("button", { name: "Run autonomous task" }));

    expect(await screen.findByText("Task is blocked because no allowed executor is available.")).toBeInTheDocument();
    expect(screen.getByText("Allowed executors: openai-compatible")).toBeInTheDocument();
    expect(screen.getByText("Dispatch: model-api")).toBeInTheDocument();
    expect(screen.getAllByText(/No executor dispatch was sent/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/OpenAI-compatible chat API is unconfigured/)).toBeInTheDocument();
  });

  it("shows allowed executor fallback decisions on the task card", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: /Tasks/i }));
    await user.click(screen.getByLabelText(/Allow OpenAI-compatible chat API/i));
    await user.type(screen.getByLabelText("Task goal"), "Create a fallback-aware checklist");
    await user.click(screen.getByRole("button", { name: "Run autonomous task" }));

    expect(await screen.findByText("Delivered a validated local planning artifact.")).toBeInTheDocument();
    expect(screen.getByText("Dispatch: model-api")).toBeInTheDocument();
    expect(screen.getByText("Dispatch: local-deterministic")).toBeInTheDocument();
    expect(screen.getByText(/Fell back to Local deterministic planner/i)).toBeInTheDocument();
    expect(screen.getByText(/No executor outside the allowlist was used/i)).toBeInTheDocument();
  });

  it("blocks a detected local agent task instead of pretending the agent ran", async () => {
    const user = userEvent.setup();
    scanLocalAgentsMock.mockResolvedValue({
      agents: [{ id: "codex-cli", displayName: "Codex CLI", available: true, version: "codex 1.2.3" }],
      message: "Scanned 1 known local agent slot."
    });
    render(<App />);

    await user.click(screen.getByRole("button", { name: /Executors/i }));
    await user.click(screen.getByRole("button", { name: "Scan local agents" }));
    expect(await screen.findByText("Scanned 1 known local agent slot.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Tasks/i }));
    await user.click(screen.getByLabelText(/Allow Local deterministic planner/i));
    await user.click(screen.getByLabelText(/Allow Codex CLI/i));
    await user.type(screen.getByLabelText("Task goal"), "Implement a local agent only change");
    await user.click(screen.getByRole("button", { name: "Run autonomous task" }));

    expect(await screen.findByText("Task is blocked because the selected executor has no Phase 1 execution adapter.")).toBeInTheDocument();
    expect(screen.getByText("Dispatch: local-agent")).toBeInTheDocument();
    expect(screen.getAllByText(/No local agent process was started/i).length).toBeGreaterThan(0);
  });

  it("can review memory layer, owner, sensitivity, and sync policy before confirmation", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: /Tasks/i }));
    await user.type(screen.getByLabelText("Task goal"), "Create memory preference checklist");
    await user.click(screen.getByRole("button", { name: "Run autonomous task" }));
    expect(await screen.findByText("Delivered")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Memory/i }));
    expect(within(screen.getByLabelText("Owner")).queryByRole("option", { name: "Mira" })).not.toBeInTheDocument();
    expect(within(screen.getByLabelText("Owner")).getByRole("option", { name: "Orion" })).toBeInTheDocument();
    expect(screen.getByText("Context Preview")).toBeInTheDocument();
    expect(screen.getByText(/does not inject every memory/i)).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText("Layer"), "character-private");
    expect(within(screen.getByLabelText("Owner")).getByRole("option", { name: "Mira" })).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText("Owner"), "mira");
    await user.selectOptions(screen.getByLabelText("Sensitivity"), "high");
    await user.click(screen.getByRole("button", { name: "Confirm reviewed memory" }));

    const confirmedMemoryPanel = screen.getByRole("region", { name: "Confirmed Memory" });
    expect(within(confirmedMemoryPanel).getByText("Confirmed memories: 1")).toBeInTheDocument();
    expect(within(confirmedMemoryPanel).getAllByText("character-private").length).toBeGreaterThan(0);
    expect(within(confirmedMemoryPanel).getByText("Mira")).toBeInTheDocument();
    expect(within(confirmedMemoryPanel).getByText("high")).toBeInTheDocument();
    expect(within(confirmedMemoryPanel).getByText("local-only")).toBeInTheDocument();
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
    await user.selectOptions(screen.getByLabelText("Voice provider"), "tts-provider");
    await user.click(screen.getByRole("button", { name: "Save character settings" }));

    expect(screen.getAllByText("A CEO spouse companion who remembers private context.").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Quiet observer").length).toBeGreaterThan(0);
    expect((screen.getByLabelText("Voice provider") as HTMLSelectElement).value).toBe("tts-provider");
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

  it("lets emotional companions react to allowlisted observation summaries", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: /Privacy/i }));
    await user.click(screen.getByRole("button", { name: "Start observation" }));
    await user.type(screen.getByLabelText("Local summary"), "User reviewed a design document");
    await user.click(screen.getByRole("button", { name: "Add local summary" }));
    await user.click(screen.getByRole("button", { name: /Desktop/i }));

    expect(screen.getByText(/I noticed Safari locally/i)).toBeInTheDocument();
    expect(screen.getByText(/no raw screen frames were stored or uploaded/i)).toBeInTheDocument();
  });

  it("captures runtime screen metadata into the local observation stream", async () => {
    const user = userEvent.setup();
    captureRuntimeScreenObservationMock.mockResolvedValue({
      status: "captured",
      appName: "Screen Capture",
      summary:
        "Runtime screen capture observed a display surface (1280x720) locally. PersonaDesk stopped the media stream immediately and discarded raw frames before storage.",
      disclosure:
        "User-initiated runtime screen capture completed locally. PersonaDesk stored only a text summary with capture metadata and discarded raw frames.",
      frameWidth: 1280,
      frameHeight: 720
    });
    render(<App />);

    await user.click(screen.getByRole("button", { name: /Privacy/i }));
    await user.click(screen.getByRole("button", { name: "Start observation" }));
    await user.click(screen.getByRole("button", { name: "Capture runtime screen summary" }));

    expect(captureRuntimeScreenObservationMock).toHaveBeenCalledTimes(1);
    expect(await screen.findByText(/Runtime screen capture observed a display surface/)).toBeInTheDocument();
    expect(screen.getByText(/runtime-screen-capture.*1280x720/)).toBeInTheDocument();
    expect(screen.getAllByText(/stored only a text summary with capture metadata/i).length).toBeGreaterThan(0);
  });

  it("records observation boundary violations for non-allowlisted apps", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: /Privacy/i }));
    await user.click(screen.getByRole("button", { name: "Start observation" }));
    await user.clear(screen.getByLabelText("Event source app"));
    await user.type(screen.getByLabelText("Event source app"), "Terminal");
    await user.type(screen.getByLabelText("Local summary"), "User ran a shell command");
    await user.click(screen.getByRole("button", { name: "Add local summary" }));

    const boundaryAudit = screen.getByLabelText("Observation boundary audit");
    expect(within(boundaryAudit).getByText("Terminal")).toBeInTheDocument();
    expect(within(boundaryAudit).getByText(/outside the active allowlist/i)).toBeInTheDocument();
    expect(within(boundaryAudit).getByText("Discarded summary characters: 24")).toBeInTheDocument();
    expect(screen.queryByText("User ran a shell command")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Approve cloud vision review" })).not.toBeInTheDocument();
  });

  it("generates a local sync preview without uploading data", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: /Tasks/i }));
    await user.type(screen.getByLabelText("Task goal"), "Create sync preview checklist");
    await user.click(screen.getByRole("button", { name: "Run autonomous task" }));
    expect(await screen.findByText("Delivered")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Memory/i }));
    await user.click(screen.getByRole("button", { name: "Confirm reviewed memory" }));

    await user.click(screen.getByRole("button", { name: /Privacy/i }));
    await user.click(screen.getByLabelText("Enable optional sync for confirmed summaries"));
    await user.click(screen.getByRole("button", { name: "Generate sync preview" }));

    expect(screen.getByText(/local preview only/i)).toBeInTheDocument();
    expect(screen.getByText("Included")).toBeInTheDocument();
    expect(screen.getByText("Excluded")).toBeInTheDocument();
    expect(screen.getAllByText("confirmed-character-definitions").length).toBeGreaterThan(0);
    expect(screen.getAllByText("confirmed-memory-summaries").length).toBeGreaterThan(0);
  });

  it("exports and preflights a local sync package without applying imports", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.type(screen.getByLabelText("Message"), "Please remember that I prefer portable sync summaries.");
    await user.click(screen.getByRole("button", { name: "Send local companion message" }));

    await user.click(screen.getByRole("button", { name: /Memory/i }));
    await user.click(screen.getByRole("button", { name: "Confirm reviewed memory" }));

    await user.click(screen.getByRole("button", { name: /Privacy/i }));
    await user.click(screen.getByLabelText("Enable optional sync for confirmed summaries"));
    await user.click(screen.getByRole("button", { name: "Export local sync package" }));

    const packageText = screen.getByLabelText("Local sync package JSON") as HTMLTextAreaElement;
    expect(packageText.value).toContain("personadesk-local-sync-package");
    expect(packageText.value).toContain("confirmed-character-definitions");
    expect(packageText.value).toContain("confirmed-memory-summaries");
    expect(packageText.value).not.toContain("secretRef");
    expect(packageText.value).not.toContain('"configuration"');

    await user.click(screen.getByRole("button", { name: "Preview sync package import" }));

    const preflight = screen.getByLabelText("Sync package import preflight");
    expect(within(preflight).getByText("Import preflight ready")).toBeInTheDocument();
    expect(within(preflight).getByText("Conflicts")).toBeInTheDocument();
    expect(within(preflight).getAllByText(/would require user review/i).length).toBeGreaterThan(0);
    expect(within(preflight).getByText(/does not merge imported data automatically/i)).toBeInTheDocument();
  });
});
