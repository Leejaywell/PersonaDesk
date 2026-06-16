import type {
  CloudUploadApproval,
  ExecutorStatus,
  ObservationBoundaryViolation,
  ObservationSession,
  ObservationSummary,
  PersonaDeskState
} from "./types";

export interface ObservationEventInput {
  appName: string;
  summary: string;
  source?: ObservationSummary["source"];
  captureDisclosure?: string;
  frameWidth?: number | null;
  frameHeight?: number | null;
}

const MANUAL_SUMMARY_DISCLOSURE =
  "Observation summary was entered manually. PersonaDesk stored text only and captured no raw screen frames.";

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
    boundaryViolations: [],
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

      const summary: ObservationSummary = {
        id: createId("observation-summary"),
        appName: input.appName.trim(),
        source: input.source ?? "manual-summary",
        summary: input.summary.trim(),
        captureDisclosure: input.captureDisclosure?.trim() || MANUAL_SUMMARY_DISCLOSURE,
        frameWidth: input.frameWidth ?? null,
        frameHeight: input.frameHeight ?? null,
        createdAt: nowIso()
      };

      if (!summary.summary) {
        return session;
      }

      if (!session.allowedApps.includes(summary.appName)) {
        const violation: ObservationBoundaryViolation = {
          id: createId("observation-boundary"),
          appName: summary.appName || "Unknown app",
          reason: "Ignored observation event because the source app is outside the active allowlist.",
          discardedSummaryCharacters: summary.summary.length,
          createdAt: nowIso()
        };

        return {
          ...session,
          boundaryViolations: [...session.boundaryViolations, violation]
        };
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
