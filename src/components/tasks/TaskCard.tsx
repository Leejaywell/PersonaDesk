import type { Task, TaskRun } from "../../domain/types";
import { StatusPill } from "../ui/StatusPill";

export function TaskCard({ run, task }: { run: TaskRun; task: Task | undefined }) {
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
            </div>
          )}
        </div>
        <StatusPill status={run.status} />
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
}
