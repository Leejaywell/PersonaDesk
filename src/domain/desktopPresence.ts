import type { DesktopPresenceAudit, DesktopPresenceAuditStatus, PersonaDeskState } from "./types";

export interface DesktopNotificationAuditInput {
  title: string;
  body: string;
  status: DesktopPresenceAuditStatus;
  disclosure: string;
}

function nowIso(): string {
  return new Date().toISOString();
}

function createId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function recordDesktopNotificationAudit(
  state: PersonaDeskState,
  input: DesktopNotificationAuditInput
): PersonaDeskState {
  const title = input.title.trim();
  const body = input.body.trim();

  if (!title || !body || !input.disclosure.trim()) {
    return state;
  }

  const audit: DesktopPresenceAudit = {
    id: createId("desktop-presence"),
    kind: "notification-preview",
    title,
    body,
    status: input.status,
    disclosure: input.disclosure.trim(),
    createdAt: nowIso()
  };

  return {
    ...state,
    desktopPresenceAudits: [...state.desktopPresenceAudits, audit]
  };
}
