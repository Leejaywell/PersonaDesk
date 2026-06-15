import type { ReactNode } from "react";
import type { ExecutorStatus, TaskRunStatus, VoiceRequestStatus } from "../../domain/types";

export type DisplayStatus = ExecutorStatus | TaskRunStatus | VoiceRequestStatus | "active" | "inactive";

export function statusLabel(status: DisplayStatus): string {
  return status
    .split("-")
    .map((part) => `${part[0]?.toUpperCase() ?? ""}${part.slice(1)}`)
    .join(" ");
}

export function statusClass(status: DisplayStatus): string {
  if (status === "available" || status === "delivered" || status === "active" || status === "ready") {
    return "status-ok";
  }

  if (status === "blocked" || status === "missing" || status === "failed") {
    return "status-risk";
  }

  return "status-muted";
}

export function StatusPill({ status, children }: { status?: DisplayStatus; children?: ReactNode }) {
  return <span className={`status-pill ${status ? statusClass(status) : ""}`}>{children ?? statusLabel(status!)}</span>;
}
