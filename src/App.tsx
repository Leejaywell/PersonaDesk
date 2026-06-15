import { useEffect, useMemo, useState, type FormEvent } from "react";
import type { SectionId } from "./app/navigation";
import type { DraftFormState, ObservationFormState, TaskFormState } from "./app/actions";
import {
  fallbackDesktopWindowPlan,
  isTauriRuntime,
  loadDesktopWindowPlan,
  type DesktopWindowPlanResult
} from "./app/desktopWindows";
import { scanLocalAgents as scanKnownLocalAgents } from "./app/localAgents";
import { playLocalSpeechPreview } from "./app/voicePlayback";
import { AppShell } from "./components/layout/AppShell";
import { CharacterStudioPage } from "./components/characters/CharacterStudioPage";
import { CompanionWindow } from "./components/desktop/CompanionWindow";
import { DesktopStagePage } from "./components/desktop/DesktopStagePage";
import { MemoryCenterPage } from "./components/memory/MemoryCenterPage";
import { PrivacySyncPage } from "./components/privacy/PrivacySyncPage";
import { ExecutorSettingsPage } from "./components/settings/ExecutorSettingsPage";
import { TaskRoomPage } from "./components/tasks/TaskRoomPage";
import {
  confirmCharacterDraft as confirmDraft,
  createCharacterDraft,
  rejectCharacterDraft as rejectDraft
} from "./domain/characterDrafts";
import { updateCharacterSettings } from "./domain/characters";
import {
  addObservationSummaryCompanionReactions,
  addTaskRunCompanionReactions,
  sendCompanionMessage
} from "./domain/conversation";
import { configureExecutor, mergeDetectedLocalAgents, recordExecutorHealthCheck } from "./domain/executors";
import { confirmMemoryCandidate as confirmMemory, rejectMemoryCandidate as rejectMemory } from "./domain/memory";
import {
  approveCloudVisionUpload,
  startObservationSession,
  stopObservationSession,
  summarizeObservationEvent
} from "./domain/observation";
import { loadState, saveState } from "./domain/storage";
import {
  buildLocalSyncPackage,
  buildSyncPreview,
  previewLocalSyncPackageImport,
  serializeLocalSyncPackage,
  type SyncPackageImportPreview,
  type SyncPreview
} from "./domain/sync";
import {
  createTask,
  grantApprovalScopesAndResumeTask,
  recordTaskAcceptance,
  runAutonomyCycle,
  runTaskRevision
} from "./domain/tasks";
import type { PersonaDeskState } from "./domain/types";
import { createVoiceRequest, recordVoicePlaybackResult } from "./domain/voice";

export default function App() {
  const [state, setState] = useState<PersonaDeskState>(() => loadState());
  const surface = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("surface") : null;
  const [activeSection, setActiveSection] = useState<SectionId>("desktop");
  const [taskForm, setTaskForm] = useState<TaskFormState>({
    goal: "",
    constraints: "Keep it local-first and privacy aware",
    desiredOutput: "Checklist",
    supervisionMode: "unsupervised",
    authorizationScope: "text-planning-only",
    allowedExecutorIds: ["local-planner"]
  });
  const [observationForm, setObservationForm] = useState<ObservationFormState>({
    allowedApps: "Safari, Notes",
    sourceApp: "Safari",
    summary: "",
    cloudVisionReason: "User requested additional visual interpretation for this local summary."
  });
  const [draftForm, setDraftForm] = useState<DraftFormState>({
    text: "A gentle companion who speaks softly and likes quiet encouragement.",
    image: null
  });
  const [localAgentScanStatus, setLocalAgentScanStatus] = useState("Not scanned in this session.");
  const [syncPreview, setSyncPreview] = useState<SyncPreview | null>(null);
  const [syncPackageText, setSyncPackageText] = useState("");
  const [syncImportPreview, setSyncImportPreview] = useState<SyncPackageImportPreview | null>(null);
  const [desktopWindowPlan, setDesktopWindowPlan] = useState<DesktopWindowPlanResult>(() => fallbackDesktopWindowPlan());

  useEffect(() => {
    saveState(state);
  }, [state]);

  useEffect(() => {
    if (!isTauriRuntime()) {
      return;
    }

    void loadDesktopWindowPlan().then(setDesktopWindowPlan);
  }, []);

  const emotionalCharacters = useMemo(
    () => state.characters.filter((character) => character.kind === "emotional"),
    [state.characters]
  );
  const taskCharacters = useMemo(
    () => state.characters.filter((character) => character.kind === "task"),
    [state.characters]
  );
  const latestRun = state.taskRuns[state.taskRuns.length - 1];
  const activeObservation = state.observationSessions.find((session) => session.active);

  function updateState(next: PersonaDeskState) {
    setState(next);
  }

  function runTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!taskForm.goal.trim()) {
      return;
    }

    let next = createTask(state, {
      goal: taskForm.goal,
      constraints: taskForm.constraints,
      desiredOutput: taskForm.desiredOutput,
      supervisionMode: taskForm.supervisionMode,
      authorizationScope: taskForm.authorizationScope,
      allowedExecutorIds: taskForm.allowedExecutorIds
    });
    const taskId = next.tasks[next.tasks.length - 1].id;
    next = runAutonomyCycle(next, taskId);
    const runId = next.taskRuns[next.taskRuns.length - 1]?.id;

    updateState(runId ? addTaskRunCompanionReactions(next, runId) : next);
    setTaskForm({ ...taskForm, goal: "" });
  }

  function generateDraft(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!draftForm.text.trim() && !draftForm.image) {
      return;
    }

    updateState(
      createCharacterDraft(state, {
        textImport: draftForm.text,
        imageFileName: draftForm.image?.name ?? null,
        imageMimeType: draftForm.image?.type || null,
        imageSizeBytes: draftForm.image?.size ?? null
      })
    );
  }

  function startObservation() {
    const apps = observationForm.allowedApps
      .split(",")
      .map((app) => app.trim())
      .filter(Boolean);
    updateState(startObservationSession(state, apps));
  }

  function stopObservation() {
    if (activeObservation) {
      updateState(stopObservationSession(state, activeObservation.id));
    }
  }

  function addObservationSummary() {
    if (!activeObservation || !observationForm.summary.trim()) {
      return;
    }

    const appName = observationForm.sourceApp.trim();
    const summarized = summarizeObservationEvent(state, activeObservation.id, {
      appName,
      summary: observationForm.summary
    });
    const nextSession = summarized.observationSessions.find((session) => session.id === activeObservation.id);
    const next =
      nextSession && nextSession.localSummaryStream.length > activeObservation.localSummaryStream.length
        ? addObservationSummaryCompanionReactions(summarized, activeObservation.id)
        : summarized;

    updateState(next);
    setObservationForm({ ...observationForm, summary: "" });
  }

  function approveCloudVision(sessionId: string, summaryId: string) {
    updateState(approveCloudVisionUpload(state, sessionId, summaryId, observationForm.cloudVisionReason));
  }

  async function scanLocalAgents() {
    setLocalAgentScanStatus("Scanning known local agents...");
    const result = await scanKnownLocalAgents();

    if (result.agents.length > 0) {
      setState((current) => mergeDetectedLocalAgents(current, result.agents));
    }

    setLocalAgentScanStatus(result.message);
  }

  const actions = {
    runTask,
    grantTaskApproval: (taskId: string, runId: string) =>
      setState((current) => {
        const next = grantApprovalScopesAndResumeTask(current, taskId, runId);
        const latestRunId = next.taskRuns[next.taskRuns.length - 1]?.id;

        return latestRunId ? addTaskRunCompanionReactions(next, latestRunId) : next;
      }),
    sendCompanionMessage: (characterId: string, text: string) =>
      setState((current) => sendCompanionMessage(current, { characterId, text })),
    generateCharacterDraft: generateDraft,
    confirmCharacterDraft: (draftId: string) => updateState(confirmDraft(state, draftId)),
    rejectCharacterDraft: (draftId: string) => updateState(rejectDraft(state, draftId)),
    updateCharacterSettings: (characterId: string, update: Parameters<typeof updateCharacterSettings>[2]) =>
      setState((current) => updateCharacterSettings(current, characterId, update)),
    confirmMemoryCandidate: (candidateId: string, review?: Parameters<typeof confirmMemory>[2]) =>
      updateState(confirmMemory(state, candidateId, review)),
    rejectMemoryCandidate: (candidateId: string) => updateState(rejectMemory(state, candidateId)),
    startObservation,
    stopObservation,
    addObservationSummary,
    approveCloudVisionUpload: approveCloudVision,
    prepareSyncPreview: () => setSyncPreview(buildSyncPreview(state)),
    exportLocalSyncPackage: () => {
      setSyncPackageText(serializeLocalSyncPackage(buildLocalSyncPackage(state)));
      setSyncImportPreview(null);
    },
    previewSyncPackageImport: () => {
      if (!syncPackageText.trim()) {
        return;
      }

      setSyncImportPreview(previewLocalSyncPackageImport(state, syncPackageText));
    },
    scanLocalAgents,
    configureExecutor: (executorId: string, configuration: Parameters<typeof configureExecutor>[2]) =>
      setState((current) => configureExecutor(current, executorId, configuration)),
    recordExecutorHealthCheck: (executorId: string) =>
      setState((current) => recordExecutorHealthCheck(current, executorId)),
    createVoiceRequest: (input: Parameters<typeof createVoiceRequest>[1]) => {
      const next = createVoiceRequest(state, input);

      updateState(next);

      if (next !== state && input.kind === "asr-transcript" && input.routeTarget === "task-goal") {
        setTaskForm((current) => ({ ...current, goal: input.text.trim() }));
      }
    },
    playVoicePreview: async (requestId: string) => {
      const request = state.voiceRequests.find((item) => item.id === requestId && item.kind === "tts-preview");

      if (!request) {
        return;
      }

      const result = await playLocalSpeechPreview(request.text);
      setState((current) => recordVoicePlaybackResult(current, requestId, result));
    },
    recordTaskAcceptance: (
      taskId: string,
      runId: string,
      decision: Parameters<typeof recordTaskAcceptance>[3],
      note?: string
    ) => setState((current) => recordTaskAcceptance(current, taskId, runId, decision, note)),
    runTaskRevision: (taskId: string, runId: string) =>
      setState((current) => {
        const next = runTaskRevision(current, taskId, runId);
        const latestRunId = next.taskRuns[next.taskRuns.length - 1]?.id;

        return latestRunId && next !== current ? addTaskRunCompanionReactions(next, latestRunId) : next;
      }),
    setSyncEnabled: (enabled: boolean) =>
      updateState({
        ...state,
        syncProfile: {
          ...state.syncProfile,
          enabled,
          lastSyncStatus: enabled ? "synced" : "never"
        }
      })
  };

  function renderSection() {
    switch (activeSection) {
      case "tasks":
        return (
          <TaskRoomPage
            actions={actions}
            executors={state.executors}
            roleBoundaries={state.roleBoundaries}
            setTaskForm={setTaskForm}
            taskCharacters={taskCharacters}
            taskForm={taskForm}
            taskRuns={state.taskRuns}
            tasks={state.tasks}
          />
        );
      case "characters":
        return (
          <CharacterStudioPage
            actions={actions}
            characterDrafts={state.characterDrafts}
            draftForm={draftForm}
            emotionalCharacters={emotionalCharacters}
            executors={state.executors}
            roleBoundaries={state.roleBoundaries}
            setDraftForm={setDraftForm}
            taskCharacters={taskCharacters}
          />
        );
      case "memory":
        return (
          <MemoryCenterPage
            actions={actions}
            characters={state.characters}
            memories={state.memories}
            memoryCandidates={state.memoryCandidates}
            taskRuns={state.taskRuns}
            tasks={state.tasks}
          />
        );
      case "executors":
        return (
          <ExecutorSettingsPage
            actions={actions}
            emotionalCharacters={emotionalCharacters}
            executorHealthChecks={state.executorHealthChecks}
            executors={state.executors}
            scanStatus={localAgentScanStatus}
            voiceRequests={state.voiceRequests}
          />
        );
      case "privacy":
        return (
          <PrivacySyncPage
            actions={actions}
            activeObservation={activeObservation}
            observationForm={observationForm}
            observationSessions={state.observationSessions}
            setObservationForm={setObservationForm}
            setSyncPackageText={setSyncPackageText}
            syncImportPreview={syncImportPreview}
            syncPackageText={syncPackageText}
            syncPreview={syncPreview}
            syncProfile={state.syncProfile}
          />
        );
      case "desktop":
      default:
        return (
          <DesktopStagePage
            actions={actions}
            conversationMessages={state.conversationMessages}
            desktopWindowPlan={desktopWindowPlan}
            emotionalCharacters={emotionalCharacters}
            latestRun={latestRun}
            roleBoundaries={state.roleBoundaries}
          />
        );
    }
  }

  if (surface === "companion") {
    return (
      <CompanionWindow
        activeObservation={activeObservation}
        emotionalCharacters={emotionalCharacters}
        latestRun={latestRun}
      />
    );
  }

  return (
    <AppShell
      activeObservation={activeObservation}
      activeSection={activeSection}
      emotionalCharacters={emotionalCharacters}
      latestRun={latestRun}
      onSectionChange={setActiveSection}
      syncEnabled={state.syncProfile.enabled}
    >
      {renderSection()}
    </AppShell>
  );
}
