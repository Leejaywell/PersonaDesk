import { useState } from "react";
import type { Task, TaskRun } from "../../domain/types";
import { StatusPill, statusLabel } from "../ui/StatusPill";

export function TaskCard({
  run,
  task,
  onGrantApproval,
  onRecordAcceptance,
  onRunRevision
}: {
  run: TaskRun;
  task: Task | undefined;
  onGrantApproval?: (taskId: string, runId: string) => void;
  onRecordAcceptance?: (taskId: string, runId: string, decision: "accepted" | "revision-requested", note?: string) => void;
  onRunRevision?: (taskId: string, runId: string) => void;
}) {
  const [revisionNote, setRevisionNote] = useState("");
  const canGrantApproval = Boolean(task && task.status === "blocked" && run.status === "blocked" && run.approvalRequests.length > 0);
  const canRecordAcceptance = Boolean(
    task && task.status === "delivered" && run.status === "delivered" && run.acceptance?.status === "pending"
  );
  const canRunRevision = Boolean(
    task && task.status === "revision-requested" && run.status === "delivered" && run.acceptance?.status === "revision-requested"
  );

  return (
    <article className="task-card">
      <div className="task-card-header">
        <div>
          <h3>{task?.title ?? "Untitled task"}</h3>
          <p>{run.finalSummary}</p>
          {task && (
            <div className="task-meta-row">
              <span className="meta-chip">Mode: {task.supervisionMode}</span>
              <span className="meta-chip">Scope: {task.authorizationScope}</span>
              <span className="meta-chip">Allowed executors: {task.allowedExecutorIds.join(", ")}</span>
              <span className="meta-chip">Task status: {task.status}</span>
              {run.revisionOfRunId ? <span className="meta-chip">Revision of: {run.revisionOfRunId}</span> : null}
            </div>
          )}
        </div>
        <StatusPill status={run.status} />
      </div>
      {run.approvalRequests.length > 0 && (
        <div className="notice danger">
          {run.approvalRequests.map((request) => (
            <p key={request.id}>
              {request.reason} Requested scope: {request.requestedScope}.
            </p>
          ))}
          {canGrantApproval && task && (
            <button onClick={() => onGrantApproval?.(task.id, run.id)} type="button">
              Grant requested scopes and continue
            </button>
          )}
        </div>
      )}
      {run.executorCalls.length > 0 && (
        <div className="executor-call-list" aria-label="Executor calls">
          {run.executorCalls.map((call) => (
            <article className="summary-card" key={`${run.id}-${call.executorId}-${call.purpose}`}>
              <div className="task-card-header">
                <strong>{call.executorId}</strong>
                <StatusPill status={call.status} />
              </div>
              <div className="task-meta-row">
                <span className="meta-chip">Type: {call.executorType}</span>
                <span className="meta-chip">Dispatch: {call.dispatchKind}</span>
                <span className="meta-chip">Started: {call.startedAt || "legacy"}</span>
                <span className="meta-chip">Completed: {call.completedAt ?? "pending"}</span>
              </div>
              <p>{call.purpose}</p>
              <p>
                <strong>{statusLabel(call.status)}:</strong> {call.outputSummary}
              </p>
              <p>{call.disclosure}</p>
            </article>
          ))}
        </div>
      )}
      {run.acceptance && (
        <div className="acceptance-panel">
          <div className="task-card-header">
            <strong>User acceptance</strong>
            <StatusPill status={run.acceptance.status} />
          </div>
          <p>{run.acceptance.note}</p>
          {canRecordAcceptance && task && (
            <>
              <label>
                Revision request note
                <textarea
                  onChange={(event) => setRevisionNote(event.target.value)}
                  placeholder="What should change before acceptance?"
                  value={revisionNote}
                />
              </label>
              <div className="button-row">
                <button onClick={() => onRecordAcceptance?.(task.id, run.id, "accepted")} type="button">
                  Accept deliverable
                </button>
                <button
                  onClick={() => onRecordAcceptance?.(task.id, run.id, "revision-requested", revisionNote)}
                  type="button"
                >
                  Request revision
                </button>
              </div>
            </>
          )}
          {canRunRevision && task && (
            <button onClick={() => onRunRevision?.(task.id, run.id)} type="button">
              Run revision
            </button>
          )}
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
}
