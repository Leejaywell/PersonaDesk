import { describe, expect, it } from "vitest";
import { createInitialState } from "./defaultState";
import { recordDesktopNotificationAudit } from "./desktopPresence";

describe("desktop presence audit", () => {
  it("records local notification preview outcomes without external delivery data", () => {
    const state = recordDesktopNotificationAudit(createInitialState(), {
      title: "PersonaDesk task delivered",
      body: "Mira can help review the result.",
      status: "sent",
      disclosure: "Local notification API was used. No cloud provider was called."
    });

    expect(state.desktopPresenceAudits).toHaveLength(1);
    expect(state.desktopPresenceAudits[0]).toMatchObject({
      kind: "notification-preview",
      title: "PersonaDesk task delivered",
      body: "Mira can help review the result.",
      status: "sent"
    });
  });

  it("ignores incomplete notification audit records", () => {
    const initial = createInitialState();
    const state = recordDesktopNotificationAudit(initial, {
      title: "",
      body: "Missing title",
      status: "failed",
      disclosure: "Should not be recorded."
    });

    expect(state).toBe(initial);
  });
});
