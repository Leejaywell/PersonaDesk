import { useEffect, useMemo, useState, type FormEvent } from "react";
import { listen } from "@tauri-apps/api/event";
import type { SectionId } from "./app/navigation";
import type { DraftFormState, ObservationFormState, TaskFormState } from "./app/actions";
import {
  fallbackCompanionWindowControlState,
  loadCompanionWindowControlState,
  setCompanionWindowControlVisible,
  type CompanionWindowControlState
} from "./app/companionWindowControl";
import {
  fallbackDesktopPresencePlan,
  loadDesktopPresencePlan,
  previewLocalDesktopNotification,
  type DesktopPresencePlan
} from "./app/desktopPresence";
import {
  fallbackDesktopWindowPlan,
  isTauriRuntime,
  loadDesktopWindowPlan,
  type DesktopWindowPlanResult
} from "./app/desktopWindows";
import { scanLocalAgents as scanKnownLocalAgents } from "./app/localAgents";
import { captureRuntimeScreenObservation } from "./app/screenObservation";
import {
  fallbackStartupBehaviorState,
  loadStartupBehaviorState,
  setStartupBehaviorEnabled,
  type StartupBehaviorState
} from "./app/startupBehavior";
import { playLocalSpeechPreview } from "./app/voicePlayback";
import { captureRuntimeSpeechTranscript } from "./app/voiceRecognition";
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
  createCustomCharacterDraft,
  rejectCharacterDraft as rejectDraft
} from "./domain/characterDrafts";
import { updateCharacterSettings } from "./domain/characters";
import {
  addObservationSummaryCompanionReactions,
  addTaskRunCompanionReactions,
  sendCompanionMessage,
  appendConversationMessage,
  updateConversationMessageText,
  proposeCompanionMemory
} from "./domain/conversation";
import { recordDesktopNotificationAudit } from "./domain/desktopPresence";
import { configureExecutor, mergeDetectedLocalAgents, recordExecutorHealthCheck, routeExecutorForTask } from "./domain/executors";
import { confirmMemoryCandidate as confirmMemory, rejectMemoryCandidate as rejectMemory } from "./domain/memory";
import {
  approveCloudVisionUpload,
  startObservationSession,
  stopObservationSession,
  summarizeObservationEvent
} from "./domain/observation";
import { loadState, saveState } from "./domain/storage";
import {
  applyLocalSyncPackageImport,
  buildLocalSyncPackage,
  buildSyncPreview,
  previewLocalSyncPackageImport,
  serializeLocalSyncPackage,
  type SyncPackageImportApplyResult,
  type SyncPackageImportPreview,
  type SyncPreview
} from "./domain/sync";
import {
  createTask,
  deliverTaskRun,
  failTaskRun,
  grantApprovalScopesAndResumeTask,
  recordTaskAcceptance,
  runAutonomyCycle,
  runTaskRevision
} from "./domain/tasks";
import type { Executor, PersonaDeskState, CharacterDraft } from "./domain/types";
import { createVoiceRequest, recordVoicePlaybackResult } from "./domain/voice";
import { buildChatMessages, buildTaskPrompt } from "./domain/promptBuilder";
import { callLLMProvider, analyzeImageWithVision } from "./app/aiProvider";


export default function App() {
  const [state, setState] = useState<PersonaDeskState>(() => loadState());
  const surface = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("surface") : null;
  const [activeSection, setActiveSection] = useState<SectionId>("desktop");
  const [taskForm, setTaskForm] = useState<TaskFormState>({
    goal: "",
    constraints: "Keep it local-first and privacy aware",
    desiredOutput: "Checklist",
    priority: "normal",
    deadline: "",
    supervisionMode: "unsupervised",
    authorizationScope: "text-planning-only",
    allowedExecutorIds: ["local-planner"]
  });
  const [observationForm, setObservationForm] = useState<ObservationFormState>({
    allowedApps: "Safari, Notes, Screen Capture",
    sourceApp: "Safari",
    summary: "",
    cloudVisionReason: "User requested additional visual interpretation for this local summary."
  });
  const [draftForm, setDraftForm] = useState<DraftFormState>({
    text: "A gentle companion who speaks softly and likes quiet encouragement.",
    image: null
  });
  const [localAgentScanStatus, setLocalAgentScanStatus] = useState("Not scanned in this session.");
  const [screenObservationStatus, setScreenObservationStatus] = useState(
    "Runtime screen capture has not been requested."
  );
  const [syncPreview, setSyncPreview] = useState<SyncPreview | null>(null);
  const [syncPackageText, setSyncPackageText] = useState("");
  const [syncImportPreview, setSyncImportPreview] = useState<SyncPackageImportPreview | null>(null);
  const [syncImportResult, setSyncImportResult] = useState<SyncPackageImportApplyResult | null>(null);
  const [desktopWindowPlan, setDesktopWindowPlan] = useState<DesktopWindowPlanResult>(() => fallbackDesktopWindowPlan());
  const [desktopPresencePlan, setDesktopPresencePlan] = useState<DesktopPresencePlan>(() => fallbackDesktopPresencePlan());
  const [companionWindowControl, setCompanionWindowControl] = useState<CompanionWindowControlState>(() =>
    fallbackCompanionWindowControlState()
  );
  const [startupBehavior, setStartupBehavior] = useState<StartupBehaviorState>(() => fallbackStartupBehaviorState());

  useEffect(() => {
    saveState(state);
  }, [state]);

  useEffect(() => {
    if (!isTauriRuntime()) {
      return;
    }

    void loadDesktopWindowPlan().then(setDesktopWindowPlan);
    void loadDesktopPresencePlan().then(setDesktopPresencePlan);
    void loadCompanionWindowControlState().then(setCompanionWindowControl);
    void loadStartupBehaviorState().then(setStartupBehavior);
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

  useEffect(() => {
    if (!isTauriRuntime()) {
      return;
    }

    let removeListener: (() => void) | undefined;
    void listen("personadesk-stop-observation", () => {
      setState((current) => {
        const activeSession = current.observationSessions.find((session) => session.active);

        return activeSession ? stopObservationSession(current, activeSession.id) : current;
      });
    }).then((unlisten) => {
      removeListener = unlisten;
    });

    return () => {
      removeListener?.();
    };
  }, []);

  function updateState(next: PersonaDeskState) {
    setState(next);
  }

  async function triggerTaskLLM(currentState: PersonaDeskState, taskId: string, runId: string, isRevision: boolean) {
    const task = currentState.tasks.find((t) => t.id === taskId);
    if (!task) return;

    const allowedIds = new Set(task.allowedExecutorIds?.filter(Boolean) ?? []);
    const allowedExecutors = allowedIds.size > 0 
      ? currentState.executors.filter((executor) => allowedIds.has(executor.id)) 
      : currentState.executors;

    const canProduce = (executor: Executor) => {
      return (
        (executor.type === "deterministic" && executor.status === "available") ||
        ((executor.type === "model-api" || executor.type === "local-model") &&
          (executor.status === "available" || executor.status === "configured"))
      );
    };

    const routed = routeExecutorForTask(currentState, {
      taskCharacterId: "orion",
      taskKind: isRevision ? "revision" : "planning",
      requiresLocalAgent: false,
      allowedExecutorIds: task.allowedExecutorIds
    });

    const fallback = allowedExecutors.find(canProduce);
    const executor = fallback && !canProduce(routed) ? fallback : routed;

    if (executor.type === "model-api" || executor.type === "local-model") {
      try {
        const taskPrompt = buildTaskPrompt(task, currentState.memories);
        const endpoint = executor.configuration.endpoint;
        const model = executor.configuration.model || "gpt-4o";
        const apiKey = executor.configuration.secretRef;

        const response = await callLLMProvider({
          endpoint,
          model,
          apiKey,
          messages: taskPrompt
        });

        setState((current) => deliverTaskRun(current, taskId, runId, executor.id, response, response));
      } catch (err: any) {
        console.error("AI task execution failed:", err);
        const errorMessage = err?.message || String(err);
        setState((current) => failTaskRun(current, taskId, runId, executor.id, errorMessage));
      }
    }
  }

  async function handleSendCompanionMessage(characterId: string, text: string) {
    const character = state.characters.find((c) => c.id === characterId);
    if (!character) return;

    const executor = state.executors.find(
      (e) =>
        (e.id === "openai-compatible" || e.id === "local-model-server") &&
        (e.status === "available" || e.status === "configured") &&
        e.configuration.endpoint
    );

    if (executor) {
      const userMsg = {
        characterId,
        speaker: "user" as const,
        text,
        source: "desktop-companion" as const,
        sourceEventId: null
      };
      const appendedUser = appendConversationMessage(state, userMsg);
      let nextState = appendedUser.state;
      const userMessageId = appendedUser.message.id;

      const thinkingMsg = {
        characterId,
        speaker: "character" as const,
        text: "...",
        source: "desktop-companion" as const,
        sourceEventId: userMessageId
      };
      const appendedThinking = appendConversationMessage(nextState, thinkingMsg);
      nextState = appendedThinking.state;
      const assistantMessageId = appendedThinking.message.id;

      updateState(nextState);

      try {
        const history = nextState.conversationMessages
          .filter((m) => m.characterId === characterId && m.id !== assistantMessageId)
          .map((m) => ({
            speaker: m.speaker,
            text: m.text
          }));

        const chatMessages = buildChatMessages(character, nextState.memories, history);

        const responseText = await callLLMProvider({
          endpoint: executor.configuration.endpoint,
          model: executor.configuration.model || "gpt-4o",
          apiKey: executor.configuration.secretRef,
          messages: chatMessages
        });

        setState((current) => {
          let updated = updateConversationMessageText(current, assistantMessageId, responseText);
          updated = proposeCompanionMemory(
            updated,
            characterId,
            userMessageId,
            text,
            "Extracted user preference or character memory candidate from desktop conversation."
          );
          return updated;
        });
      } catch (err) {
        console.error("AI companion message failed:", err);
        setState((current) =>
          updateConversationMessageText(
            current,
            assistantMessageId,
            `Error calling ${executor.displayName}.`
          )
        );
      }
    } else {
      setState((current) => sendCompanionMessage(current, { characterId, text }));
    }
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
      priority: taskForm.priority,
      deadline: taskForm.deadline,
      supervisionMode: taskForm.supervisionMode,
      authorizationScope: taskForm.authorizationScope,
      allowedExecutorIds: taskForm.allowedExecutorIds
    });
    const taskId = next.tasks[next.tasks.length - 1].id;
    next = runAutonomyCycle(next, taskId);
    const run = next.taskRuns[next.taskRuns.length - 1];

    const finalNext = run?.id ? addTaskRunCompanionReactions(next, run.id) : next;
    updateState(finalNext);
    setTaskForm({ ...taskForm, goal: "" });

    if (run && run.status === "running") {
      triggerTaskLLM(finalNext, taskId, run.id, false);
    }
  }

  async function generateDraft(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!draftForm.text.trim() && !draftForm.image) {
      return;
    }

    const visionExecutor = state.executors.find((e) => e.id === "vision-provider");
    const isVisionAvailable =
      visionExecutor &&
      (visionExecutor.status === "available" || visionExecutor.status === "configured") &&
      visionExecutor.configuration.endpoint;

    if (isVisionAvailable && draftForm.image) {
      try {
        const file = draftForm.image;
        const base64Data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        const prompt = `Please analyze the provided image (and the accompanying text description: "${draftForm.text.trim()}") to design a desktop companion character. Return a JSON object with the following fields:
{
  "nameSuggestion": "suggested name",
  "kind": "emotional" or "task",
  "relationshipTemplate": "partner", "reviewer", "observer", or "custom",
  "personaSummary": "concise description of the character's personality and characteristics",
  "speakingStyle": "speaking style description",
  "memoryPermissionProfile": ["relationship", "preferences", "shared-world"] or ["task"],
  "appearanceAccent": "hex color code representing their accent color",
  "disclosures": ["Vision-based draft generated from uploaded image"]
}
Return ONLY the raw JSON object, without markdown formatting or code blocks.`;

        const responseText = await analyzeImageWithVision(
          visionExecutor.configuration.endpoint,
          visionExecutor.configuration.model || "gpt-4o",
          visionExecutor.configuration.secretRef,
          base64Data,
          prompt
        );

        const cleanText = responseText.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
        const parsed = JSON.parse(cleanText);

        const draft: Omit<CharacterDraft, "id" | "createdAt"> = {
          nameSuggestion: parsed.nameSuggestion || "Ari",
          kind: parsed.kind === "task" ? "task" : "emotional",
          relationshipTemplate: parsed.relationshipTemplate || "custom",
          personaSummary: parsed.personaSummary || "A vision-generated companion draft.",
          speakingStyle: parsed.speakingStyle || "Natural and direct.",
          memoryPermissionProfile: Array.isArray(parsed.memoryPermissionProfile)
            ? parsed.memoryPermissionProfile
            : parsed.kind === "task" ? ["task"] : ["relationship", "preferences", "shared-world"],
          appearanceAccent: parsed.appearanceAccent || (parsed.kind === "task" ? "#2563eb" : "#b45309"),
          sourceText: draftForm.text || `Vision draft: ${file.name}`,
          imageFileName: file.name,
          imageMimeType: file.type || null,
          imageSizeBytes: file.size || null,
          disclosures: Array.isArray(parsed.disclosures)
            ? parsed.disclosures
            : ["Vision-based draft generated from uploaded image."]
        };

        setState((current) => createCustomCharacterDraft(current, draft));
        setDraftForm({ text: "", image: null });
        return;
      } catch (err) {
        console.error("Vision draft generation failed, falling back to deterministic generation:", err);
      }
    }

    setState((current) =>
      createCharacterDraft(current, {
        textImport: draftForm.text,
        imageFileName: draftForm.image?.name ?? null,
        imageMimeType: draftForm.image?.type || null,
        imageSizeBytes: draftForm.image?.size ?? null
      })
    );
    setDraftForm({ text: "", image: null });
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

  async function captureScreenObservation() {
    if (!activeObservation) {
      setScreenObservationStatus("Start an observation session before requesting runtime screen capture.");
      return;
    }

    setScreenObservationStatus("Requesting runtime screen capture...");
    const result = await captureRuntimeScreenObservation();
    setScreenObservationStatus(result.disclosure);

    if (result.status !== "captured" || !result.summary.trim()) {
      return;
    }

    setState((current) => {
      const currentActiveObservation = current.observationSessions.find((session) => session.active);

      if (!currentActiveObservation) {
        return current;
      }

      const summarized = summarizeObservationEvent(current, currentActiveObservation.id, {
        appName: result.appName,
        summary: result.summary,
        source: "runtime-screen-capture",
        captureDisclosure: result.disclosure,
        frameWidth: result.frameWidth,
        frameHeight: result.frameHeight
      });
      const nextSession = summarized.observationSessions.find((session) => session.id === currentActiveObservation.id);

      return nextSession && nextSession.localSummaryStream.length > currentActiveObservation.localSummaryStream.length
        ? addObservationSummaryCompanionReactions(summarized, currentActiveObservation.id)
        : summarized;
    });
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

  async function previewDesktopNotification() {
    const title =
      latestRun?.status === "blocked"
        ? "PersonaDesk task needs approval"
        : latestRun
          ? "PersonaDesk task delivered"
          : "PersonaDesk companion is standing by";
    const body = latestRun?.finalSummary || "Mira can stay visible while the console handles deeper work.";
    const result = await previewLocalDesktopNotification({ title, body });

    setState((current) =>
      recordDesktopNotificationAudit(current, {
        title,
        body,
        status: result.status,
        disclosure: result.disclosure
      })
    );
  }

  async function toggleStartupBehavior() {
    setStartupBehavior((current) => ({
      ...current,
      status: "updating",
      disclosure: current.enabled
        ? "Disabling PersonaDesk startup registration..."
        : "Enabling PersonaDesk startup registration..."
    }));
    const next = await setStartupBehaviorEnabled(!startupBehavior.enabled);

    setStartupBehavior(next);
  }

  async function toggleCompanionWindow() {
    setCompanionWindowControl((current) => ({
      ...current,
      status: "updating",
      disclosure: current.visible ? "Hiding companion window..." : "Showing companion window..."
    }));
    const next = await setCompanionWindowControlVisible(!companionWindowControl.visible);

    setCompanionWindowControl(next);
  }

  const actions = {
    runTask,
    grantTaskApproval: (taskId: string, runId: string) =>
      setState((current) => {
        const next = grantApprovalScopesAndResumeTask(current, taskId, runId);
        const latestRunId = next.taskRuns[next.taskRuns.length - 1]?.id;

        return latestRunId ? addTaskRunCompanionReactions(next, latestRunId) : next;
      }),
    sendCompanionMessage: handleSendCompanionMessage,
    generateCharacterDraft: generateDraft,
    confirmCharacterDraft: (draftId: string) => setState((current) => confirmDraft(current, draftId)),
    rejectCharacterDraft: (draftId: string) => setState((current) => rejectDraft(current, draftId)),
    updateCharacterSettings: (characterId: string, update: Parameters<typeof updateCharacterSettings>[2]) =>
      setState((current) => updateCharacterSettings(current, characterId, update)),
    confirmMemoryCandidate: (candidateId: string, review?: Parameters<typeof confirmMemory>[2]) =>
      setState((current) => confirmMemory(current, candidateId, review)),
    rejectMemoryCandidate: (candidateId: string) => setState((current) => rejectMemory(current, candidateId)),
    startObservation,
    stopObservation,
    addObservationSummary,
    captureScreenObservation,
    approveCloudVisionUpload: approveCloudVision,
    prepareSyncPreview: () => setSyncPreview(buildSyncPreview(state)),
    exportLocalSyncPackage: () => {
      setSyncPackageText(serializeLocalSyncPackage(buildLocalSyncPackage(state)));
      setSyncImportPreview(null);
      setSyncImportResult(null);
    },
    previewSyncPackageImport: () => {
      if (!syncPackageText.trim()) {
        return;
      }

      setSyncImportPreview(previewLocalSyncPackageImport(state, syncPackageText));
      setSyncImportResult(null);
    },
    applySyncPackageImport: () => {
      if (!syncPackageText.trim()) {
        return;
      }

      const applied = applyLocalSyncPackageImport(state, syncPackageText);

      updateState(applied.state);
      setSyncImportResult(applied.result);
      setSyncImportPreview(previewLocalSyncPackageImport(applied.state, syncPackageText));
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
    captureSpeechTranscript: captureRuntimeSpeechTranscript,
    playVoicePreview: async (requestId: string) => {
      const request = state.voiceRequests.find((item) => item.id === requestId && item.kind === "tts-preview");

      if (!request) {
        return;
      }

      const result = await playLocalSpeechPreview(request.text);
      setState((current) => recordVoicePlaybackResult(current, requestId, result));
    },
    toggleCompanionWindow,
    previewDesktopNotification,
    toggleStartupBehavior,
    recordTaskAcceptance: (
      taskId: string,
      runId: string,
      decision: Parameters<typeof recordTaskAcceptance>[3],
      note?: string
    ) => setState((current) => recordTaskAcceptance(current, taskId, runId, decision, note)),
    runTaskRevision: (taskId: string, runId: string) => {
      let finalNext: PersonaDeskState | null = null;
      let runIdToTrigger: string | null = null;
      setState((current) => {
        const next = runTaskRevision(current, taskId, runId);
        const latestRun = next.taskRuns[next.taskRuns.length - 1];
        if (latestRun && latestRun.status === "running") {
          runIdToTrigger = latestRun.id;
        }
        finalNext = latestRun?.id && next !== current ? addTaskRunCompanionReactions(next, latestRun.id) : next;
        return finalNext;
      });

      if (runIdToTrigger && finalNext) {
        triggerTaskLLM(finalNext, taskId, runIdToTrigger, true);
      }
    },
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
            screenObservationStatus={screenObservationStatus}
            setObservationForm={setObservationForm}
            setSyncPackageText={setSyncPackageText}
            syncImportPreview={syncImportPreview}
            syncImportResult={syncImportResult}
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
            companionWindowControl={companionWindowControl}
            conversationMessages={state.conversationMessages}
            desktopPresenceAudits={state.desktopPresenceAudits}
            desktopPresencePlan={desktopPresencePlan}
            desktopWindowPlan={desktopWindowPlan}
            emotionalCharacters={emotionalCharacters}
            latestRun={latestRun}
            roleBoundaries={state.roleBoundaries}
            startupBehavior={startupBehavior}
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
