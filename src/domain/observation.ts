import type { ObservationSession, ObservationSummary, PersonaDeskState } from "./types";

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
