import { describe, expect, it } from "vitest";
import { createInitialState } from "./defaultState";
import { sendCompanionMessage } from "./conversation";

describe("companion conversation", () => {
  it("adds a local user message and deterministic emotional-character reply", () => {
    const state = sendCompanionMessage(createInitialState(), {
      characterId: "mira",
      text: "Can you stay with me while I review this?"
    });

    expect(state.conversationMessages).toHaveLength(2);
    expect(state.conversationMessages[0].speaker).toBe("user");
    expect(state.conversationMessages[1].speaker).toBe("character");
    expect(state.conversationMessages[1].text).toContain("No model provider was called");
  });

  it("does not let task characters act as desktop companions", () => {
    const state = sendCompanionMessage(createInitialState(), {
      characterId: "orion",
      text: "Hello from the desktop"
    });

    expect(state.conversationMessages).toHaveLength(0);
  });

  it("ignores empty messages", () => {
    const state = sendCompanionMessage(createInitialState(), {
      characterId: "mira",
      text: "   "
    });

    expect(state.conversationMessages).toHaveLength(0);
  });
});
