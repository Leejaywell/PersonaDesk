import { useEffect, useMemo, useState, type FormEvent } from "react";
import type { SectionId } from "./app/navigation";
import type { DraftFormState, ObservationFormState, TaskFormState } from "./app/actions";
import { scanLocalAgents as scanKnownLocalAgents } from "./app/localAgents";
import { AppShell } from "./components/layout/AppShell";
import { CharacterStudioPage } from "./components/characters/CharacterStudioPage";
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
import { configureExecutor, mergeDetectedLocalAgents } from "./domain/executors";
import { confirmMemoryCandidate as confirmMemory, rejectMemoryCandidate as rejectMemory } from "./domain/memory";
import {
  approveCloudVisionUpload,
  startObservationSession,
  stopObservationSession,
  summarizeObservationEvent
} from "./domain/observation";
import { loadState, saveState } from "./domain/storage";
import { buildSyncPreview, type SyncPreview } from "./domain/sync";
import { createTask, grantApprovalScopesAndResumeTask, runAutonomyCycle } from "./domain/tasks";
import type { PersonaDeskState } from "./domain/types";

export default function App() {
  const [state, setState] = useState<PersonaDeskState>(() => loadState());
  const [activeSection, setActiveSection] = useState<SectionId>("desktop");
  const [taskForm, setTaskForm] = useState<TaskFormState>({
    goal: "",
    constraints: "Keep it local-first and privacy aware",
    desiredOutput: "Checklist",
    supervisionMode: "unsupervised",
    authorizationScope: "text-planning-only"
  });
  const [observationForm, setObservationForm] = useState<ObservationFormState>({
    allowedApps: "Safari, Notes",
    summary: "",
    cloudVisionReason: "User requested additional visual interpretation for this local summary."
  });
  const [draftForm, setDraftForm] = useState<DraftFormState>({
    text: "A gentle companion who speaks softly and likes quiet encouragement.",
    image: null
  });
  const [localAgentScanStatus, setLocalAgentScanStatus] = useState("Not scanned in this session.");
  const [syncPreview, setSyncPreview] = useState<SyncPreview | null>(null);

  useEffect(() => {
    saveState(state);
  }, [state]);

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
      authorizationScope: taskForm.authorizationScope
    });
    const taskId = next.tasks[next.tasks.length - 1].id;
    next = runAutonomyCycle(next, taskId);

    updateState(next);
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

    const appName = activeObservation.allowedApps[0];
    updateState(
      summarizeObservationEvent(state, activeObservation.id, {
        appName,
        summary: observationForm.summary
      })
    );
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
      setState((current) => grantApprovalScopesAndResumeTask(current, taskId, runId)),
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
    scanLocalAgents,
    configureExecutor: (executorId: string, configuration: Parameters<typeof configureExecutor>[2]) =>
      setState((current) => configureExecutor(current, executorId, configuration)),
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
          />
        );
      case "executors":
        return <ExecutorSettingsPage actions={actions} executors={state.executors} scanStatus={localAgentScanStatus} />;
      case "privacy":
        return (
          <PrivacySyncPage
            actions={actions}
            activeObservation={activeObservation}
            observationForm={observationForm}
            observationSessions={state.observationSessions}
            setObservationForm={setObservationForm}
            syncPreview={syncPreview}
            syncProfile={state.syncProfile}
          />
        );
      case "desktop":
      default:
        return (
          <DesktopStagePage
            emotionalCharacters={emotionalCharacters}
            latestRun={latestRun}
            roleBoundaries={state.roleBoundaries}
          />
        );
    }
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
