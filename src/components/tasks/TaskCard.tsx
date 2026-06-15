import type { Task, TaskRun } from "../../domain/types";
import { StatusPill } from "../ui/StatusPill";

export function TaskCard({
  run,
  task,
  onGrantApproval
}: {
  run: TaskRun;
  task: Task | undefined;
  onGrantApproval?: (taskId: string, runId: string) => void;
}) {
  const canGrantApproval = Boolean(task && task.status === "blocked" && run.status === "blocked" && run.approvalRequests.length > 0);

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
                <StatusPill>{call.status}</StatusPill>
              </div>
              <p>{call.purpose}</p>
              <p>{call.disclosure}</p>
            </article>
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
}
