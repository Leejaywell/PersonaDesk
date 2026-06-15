import {
  Bot,
  Brain,
  Check,
  Eye,
  Mic,
  Play,
  Shield,
  Sparkles,
  Users,
  Volume2,
  X
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { executorDisclosure } from "./domain/executors";
import { confirmMemoryCandidate, rejectMemoryCandidate } from "./domain/memory";
import { startObservationSession, stopObservationSession, summarizeObservationEvent } from "./domain/observation";
import { loadState, saveState } from "./domain/storage";
import { createTask, runAutonomyCycle } from "./domain/tasks";
import type { Character, ExecutorStatus, PersonaDeskState, TaskRunStatus } from "./domain/types";

function statusLabel(status: ExecutorStatus | TaskRunStatus | "active" | "inactive"): string {
  return status
    .split("-")
    .map((part) => `${part[0]?.toUpperCase() ?? ""}${part.slice(1)}`)
    .join(" ");
}

function statusClass(status: ExecutorStatus | TaskRunStatus | "active" | "inactive"): string {
  if (status === "available" || status === "delivered" || status === "active") {
    return "status-ok";
  }

  if (status === "blocked" || status === "missing" || status === "failed") {
    return "status-risk";
  }

  return "status-muted";
}

function CharacterCard({ character, boundaryLabel }: { character: Character; boundaryLabel: string }) {
  return (
    <article className="character-card">
      <div className="avatar-token" style={{ backgroundColor: character.appearance.accent }}>
        {character.appearance.avatarLabel}
      </div>
      <div>
        <h3>{character.name}</h3>
        <p>{character.customRelationship}</p>
        <div className="meta-row">
          <span>{character.relationshipTemplate}</span>
          <span>{boundaryLabel}</span>
        </div>
      </div>
    </article>
  );
}

export default function App() {
  const [state, setState] = useState<PersonaDeskState>(() => loadState());
  const [taskGoal, setTaskGoal] = useState("");
  const [taskConstraints, setTaskConstraints] = useState("Keep it local-first and privacy aware");
  const [desiredOutput, setDesiredOutput] = useState("Checklist");
  const [allowedApps, setAllowedApps] = useState("Safari, Notes");
  const [observationSummary, setObservationSummary] = useState("");

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
  const voiceExecutors = state.executors.filter((executor) => executor.type === "asr" || executor.type === "tts");

  function updateState(next: PersonaDeskState) {
    setState(next);
  }

  function runTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!taskGoal.trim()) {
      return;
    }

    let next = createTask(state, {
      goal: taskGoal,
      constraints: taskConstraints,
      desiredOutput,
      supervisionMode: "unsupervised",
      authorizationScope: "text-planning-only"
    });
    const taskId = next.tasks[next.tasks.length - 1].id;
    next = runAutonomyCycle(next, taskId);

    updateState(next);
    setTaskGoal("");
  }

  function startObservation() {
    const apps = allowedApps
      .split(",")
      .map((app) => app.trim())
      .filter(Boolean);
    updateState(startObservationSession(state, apps));
  }

  function addObservationSummary() {
    if (!activeObservation || !observationSummary.trim()) {
      return;
    }

    const appName = activeObservation.allowedApps[0];
    updateState(
      summarizeObservationEvent(state, activeObservation.id, {
        appName,
        summary: observationSummary
      })
    );
    setObservationSummary("");
  }

  return (
    <main className="app-shell">
      <section className="topbar" aria-label="PersonaDesk overview">
        <div>
          <h1>PersonaDesk</h1>
          <p>Multi-character desktop companion platform</p>
        </div>
        <div className="topbar-actions">
          <span className="status-pill status-ok">Local-first</span>
          <span className="status-pill">Phase 1 thin slice</span>
        </div>
      </section>

      <section className="workspace-grid">
        <section className="panel desktop-stage" aria-labelledby="desktop-stage-title">
          <div className="panel-heading">
            <div>
              <h2 id="desktop-stage-title">Desktop Stage</h2>
              <span>Mixed presence: emotional characters stay visible, task characters gather in rooms.</span>
            </div>
            <Sparkles aria-hidden="true" size={19} />
          </div>
          <div className="stage-surface">
            {emotionalCharacters.map((character, index) => (
              <div
                className={`avatar-card ${index % 2 === 0 ? "warm" : "cool"}`}
                key={character.id}
                style={{ backgroundColor: character.appearance.accent }}
              >
                {character.appearance.avatarLabel}
              </div>
            ))}
            <div className="stage-caption">Emotional characters can observe and comment within configured boundaries.</div>
          </div>
        </section>

        <section className="panel task-stage" aria-labelledby="task-room-title">
          <div className="panel-heading">
            <div>
              <h2 id="task-room-title">Task Room</h2>
              <span>Efficiency view backed by factual task runs.</span>
            </div>
            <Users aria-hidden="true" size={19} />
          </div>

          <form className="task-form" onSubmit={runTask}>
            <label>
              Task goal
              <input
                value={taskGoal}
                onChange={(event) => setTaskGoal(event.target.value)}
                placeholder="Create a privacy checklist"
              />
            </label>
            <label>
              Constraints
              <input value={taskConstraints} onChange={(event) => setTaskConstraints(event.target.value)} />
            </label>
            <label>
              Desired output
              <input value={desiredOutput} onChange={(event) => setDesiredOutput(event.target.value)} />
            </label>
            <button className="primary-button" type="submit">
              <Play aria-hidden="true" size={16} />
              Run autonomous task
            </button>
          </form>
        </section>

        <section className="panel" aria-labelledby="emotional-characters-title">
          <div className="panel-heading">
            <div>
              <h2 id="emotional-characters-title">Emotional Characters</h2>
              <span>Relationship, presence, and memory requests without default tool execution.</span>
            </div>
            <Brain aria-hidden="true" size={19} />
          </div>
          <div className="card-list">
            {emotionalCharacters.map((character) => (
              <CharacterCard
                boundaryLabel={state.roleBoundaries[character.roleBoundaryId].label}
                character={character}
                key={character.id}
              />
            ))}
          </div>
        </section>

        <section className="panel" aria-labelledby="task-characters-title">
          <div className="panel-heading">
            <div>
              <h2 id="task-characters-title">Task Characters</h2>
              <span>Task room roles with explicit executor permissions.</span>
            </div>
            <Bot aria-hidden="true" size={19} />
          </div>
          <div className="card-list">
            {taskCharacters.map((character) => (
              <CharacterCard
                boundaryLabel={state.roleBoundaries[character.roleBoundaryId].label}
                character={character}
                key={character.id}
              />
            ))}
          </div>
        </section>

        <section className="panel wide-panel" aria-labelledby="task-cards-title">
          <div className="panel-heading">
            <div>
              <h2 id="task-cards-title">Task Cards</h2>
              <span>Long-task autonomy records plan, execution, validation, artifacts, and approval gates.</span>
            </div>
            <Check aria-hidden="true" size={19} />
          </div>
          {state.taskRuns.length === 0 ? (
            <p className="empty-state">No task run yet.</p>
          ) : (
            <div className="task-card-list">
              {state.taskRuns.map((run) => {
                const task = state.tasks.find((item) => item.id === run.taskId);
                return (
                  <article className="task-card" key={run.id}>
                    <div className="task-card-header">
                      <div>
                        <h3>{task?.title ?? "Untitled task"}</h3>
                        <p>{run.finalSummary}</p>
                      </div>
                      <span className={`status-pill ${statusClass(run.status)}`}>{statusLabel(run.status)}</span>
                    </div>
                    {run.approvalRequests.length > 0 && (
                      <div className="notice danger">
                        {run.approvalRequests.map((request) => (
                          <p key={request.id}>{request.reason}</p>
                        ))}
                      </div>
                    )}
                    {run.artifacts.map((artifact) => (
                      <pre className="artifact" key={artifact.id}>
                        {artifact.content}
                      </pre>
                    ))}
                    <div className="validation-grid">
                      {run.validationResults.map((result) => (
                        <span className={result.passed ? "check-pass" : "check-fail"} key={result.id}>
                          {result.label}
                        </span>
                      ))}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section className="panel" aria-labelledby="memory-title">
          <div className="panel-heading">
            <div>
              <h2 id="memory-title">Memory Review</h2>
              <span>Candidates require confirmation before long-term write.</span>
            </div>
            <Shield aria-hidden="true" size={19} />
          </div>
          {state.memoryCandidates.length === 0 ? (
            <p className="empty-state">No pending memory candidates.</p>
          ) : (
            <div className="card-list">
              {state.memoryCandidates.map((candidate) => (
                <article className="review-card" key={candidate.id}>
                  <p>{candidate.proposedText}</p>
                  <small>{candidate.reason}</small>
                  <div className="button-row">
                    <button onClick={() => updateState(confirmMemoryCandidate(state, candidate.id))} type="button">
                      <Check aria-hidden="true" size={15} />
                      Confirm
                    </button>
                    <button onClick={() => updateState(rejectMemoryCandidate(state, candidate.id))} type="button">
                      <X aria-hidden="true" size={15} />
                      Reject
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
          <p className="memory-count">Confirmed memories: {state.memories.length}</p>
        </section>

        <section className="panel" aria-labelledby="executors-title">
          <div className="panel-heading">
            <div>
              <h2 id="executors-title">Executor Registry</h2>
              <span>Unavailable providers stay visible and honest.</span>
            </div>
            <Bot aria-hidden="true" size={19} />
          </div>
          <div className="executor-list">
            {state.executors.map((executor) => (
              <article className="executor-row" key={executor.id}>
                <div>
                  <strong>{executor.displayName}</strong>
                  <p>{executorDisclosure(executor)}</p>
                </div>
                <span className={`status-pill ${statusClass(executor.status)}`}>{statusLabel(executor.status)}</span>
              </article>
            ))}
          </div>
        </section>

        <section className="panel" aria-labelledby="observation-title">
          <div className="panel-heading">
            <div>
              <h2 id="observation-title">Observation</h2>
              <span>Manual sessions, app allowlists, local summaries only.</span>
            </div>
            <Eye aria-hidden="true" size={19} />
          </div>
          <label>
            Allowed apps
            <input value={allowedApps} onChange={(event) => setAllowedApps(event.target.value)} />
          </label>
          <div className="button-row">
            <button onClick={startObservation} type="button">
              <Eye aria-hidden="true" size={15} />
              Start observation
            </button>
            <button
              disabled={!activeObservation}
              onClick={() => activeObservation && updateState(stopObservationSession(state, activeObservation.id))}
              type="button"
            >
              <X aria-hidden="true" size={15} />
              Stop
            </button>
          </div>
          <label>
            Local summary
            <input
              disabled={!activeObservation}
              value={observationSummary}
              onChange={(event) => setObservationSummary(event.target.value)}
              placeholder="User reviewed a design document"
            />
          </label>
          <button disabled={!activeObservation} onClick={addObservationSummary} type="button">
            <Check aria-hidden="true" size={15} />
            Add local summary
          </button>
          <div className="summary-list">
            {state.observationSessions.flatMap((session) =>
              session.localSummaryStream.map((summary) => (
                <p key={summary.id}>
                  <strong>{summary.appName}</strong>: {summary.summary}
                </p>
              ))
            )}
          </div>
        </section>

        <section className="panel" aria-labelledby="voice-title">
          <div className="panel-heading">
            <div>
              <h2 id="voice-title">Voice</h2>
              <span>ASR/TTS provider slots are explicit and unconfigured by default.</span>
            </div>
            <Mic aria-hidden="true" size={19} />
          </div>
          <div className="executor-list">
            {voiceExecutors.map((executor) => (
              <article className="executor-row" key={executor.id}>
                <div>
                  <strong>{executor.displayName}</strong>
                  <p>{executor.statusReason}</p>
                </div>
                {executor.type === "tts" ? <Volume2 aria-hidden="true" size={18} /> : <Mic aria-hidden="true" size={18} />}
              </article>
            ))}
          </div>
        </section>

        <section className="panel" aria-labelledby="sync-title">
          <div className="panel-heading">
            <div>
              <h2 id="sync-title">Sync</h2>
              <span>Local-first, optional summaries only.</span>
            </div>
            <Shield aria-hidden="true" size={19} />
          </div>
          <label className="toggle-row">
            <input
              checked={state.syncProfile.enabled}
              onChange={(event) =>
                updateState({
                  ...state,
                  syncProfile: {
                    ...state.syncProfile,
                    enabled: event.target.checked,
                    lastSyncStatus: event.target.checked ? "synced" : "never"
                  }
                })
              }
              type="checkbox"
            />
            Enable optional sync for confirmed summaries
          </label>
          <p className="local-only">
            Local-only: {state.syncProfile.localOnlyClasses.join(", ")}
          </p>
        </section>
      </section>

      {latestRun && <div className="toast">Latest task: {statusLabel(latestRun.status)}</div>}
    </main>
  );
}
