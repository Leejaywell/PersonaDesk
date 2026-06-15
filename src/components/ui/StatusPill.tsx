import type { ReactNode } from "react";
import type {
  ExecutorHealthCheckStatus,
  ExecutorStatus,
  TaskAcceptanceStatus,
  TaskRunStatus,
  TaskStatus,
  VoiceRequestStatus
} from "../../domain/types";

export type DisplayStatus =
  | ExecutorStatus
  | TaskAcceptanceStatus
  | TaskRunStatus
  | TaskStatus
  | VoiceRequestStatus
  | ExecutorHealthCheckStatus
  | "active"
  | "inactive";

export function statusLabel(status: DisplayStatus): string {
  return status
    .split("-")
    .map((part) => `${part[0]?.toUpperCase() ?? ""}${part.slice(1)}`)
    .join(" ");
}

export function statusClass(status: DisplayStatus): string {
  if (
    status === "accepted" ||
    status === "available" ||
    status === "delivered" ||
    status === "active" ||
    status === "ready"
  ) {
    return "status-ok";
  }

  if (status === "blocked" || status === "missing" || status === "failed" || status === "revision-requested") {
    return "status-risk";
  }

  return "status-muted";
}

export function StatusPill({ status, children }: { status?: DisplayStatus; children?: ReactNode }) {
  return <span className={`status-pill ${status ? statusClass(status) : ""}`}>{children ?? statusLabel(status!)}</span>;
}
