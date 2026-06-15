import type { CloudUploadApproval, ExecutorStatus, ObservationSession, ObservationSummary, PersonaDeskState } from "./types";

export interface ObservationEventInput {
  appName: string;
  summary: string;
}

function createId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

export function startObservationSession(
  state: PersonaDeskState,
  allowedApps: string[]
): PersonaDeskState {
  const session: ObservationSession = {
    id: createId("observation"),
    allowedApps: allowedApps.map((app) => app.trim()).filter(Boolean),
    active: true,
    localSummaryStream: [],
    cloudUploadApprovals: [],
    retentionPolicy: "summaries-only",
    startedAt: nowIso(),
    endedAt: null
  };

  return {
    ...state,
    observationSessions: [...state.observationSessions, session]
  };
}

export function summarizeObservationEvent(
  state: PersonaDeskState,
  sessionId: string,
  input: ObservationEventInput
): PersonaDeskState {
  return {
    ...state,
    observationSessions: state.observationSessions.map((session) => {
      if (session.id !== sessionId || !session.active) {
        return session;
      }

      if (!session.allowedApps.includes(input.appName)) {
        return session;
      }

      const summary: ObservationSummary = {
        id: createId("observation-summary"),
        appName: input.appName,
        summary: input.summary.trim(),
        createdAt: nowIso()
      };

      if (!summary.summary) {
        return session;
      }

      return {
        ...session,
        localSummaryStream: [...session.localSummaryStream, summary]
      };
    })
  };
}

export function stopObservationSession(state: PersonaDeskState, sessionId: string): PersonaDeskState {
  return {
    ...state,
    observationSessions: state.observationSessions.map((session) =>
      session.id === sessionId
        ? {
            ...session,
            active: false,
            endedAt: nowIso()
          }
        : session
    )
  };
}

function visionProviderStatus(state: PersonaDeskState): ExecutorStatus {
  return state.executors.find((executor) => executor.type === "vision")?.status ?? "missing";
}

function cloudApprovalDisclosure(providerStatus: ExecutorStatus): string {
  if (providerStatus === "available") {
    return "Cloud vision approval was recorded, but Phase 1 does not upload raw screen frames automatically.";
  }

  return "Cloud vision approval was recorded for audit only; no configured vision provider is available and no raw screen frame was uploaded.";
}

export function approveCloudVisionUpload(
  state: PersonaDeskState,
  sessionId: string,
  summaryId: string,
  reason: string
): PersonaDeskState {
  const providerStatus = visionProviderStatus(state);

  return {
    ...state,
    observationSessions: state.observationSessions.map((session) => {
      if (session.id !== sessionId) {
        return session;
      }

      if (session.cloudUploadApprovals.some((approval) => approval.summaryId === summaryId)) {
        return session;
      }

      const summary = session.localSummaryStream.find((item) => item.id === summaryId);

      if (!summary) {
        return session;
      }

      const approval: CloudUploadApproval = {
        id: createId("cloud-vision-approval"),
        summaryId,
        appName: summary.appName,
        providerStatus,
        reason: reason.trim() || "User explicitly approved this local summary for cloud vision review.",
        uploaded: false,
        disclosure: cloudApprovalDisclosure(providerStatus),
        approvedAt: nowIso()
      };

      return {
        ...session,
        cloudUploadApprovals: [...session.cloudUploadApprovals, approval]
      };
    })
  };
}
