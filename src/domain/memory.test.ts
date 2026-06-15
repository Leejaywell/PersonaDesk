import { describe, expect, it } from "vitest";
import { createInitialState } from "./defaultState";
import { confirmMemoryCandidate, proposeMemoryCandidate, rejectMemoryCandidate } from "./memory";

describe("memory review", () => {
  it("keeps proposed memories out of long-term memory until confirmed", () => {
    let state = createInitialState();
    state = proposeMemoryCandidate(state, {
      layer: "character-private",
      ownerCharacterId: "mira",
      text: "The user likes quiet encouragement during long tasks.",
      source: "conversation",
      sensitivity: "low",
      reason: "Stable interaction preference"
    });

    expect(state.memoryCandidates).toHaveLength(1);
    expect(state.memories).toHaveLength(0);

    state = confirmMemoryCandidate(state, state.memoryCandidates[0].id);

    expect(state.memoryCandidates).toHaveLength(0);
    expect(state.memories).toHaveLength(1);
    expect(state.memories[0].ownerCharacterId).toBe("mira");
  });

  it("rejects candidates without writing memory", () => {
    let state = createInitialState();
    state = proposeMemoryCandidate(state, {
      layer: "task",
      ownerCharacterId: null,
      text: "Summaries should include validation notes.",
      source: "task-run",
      sensitivity: "low",
      reason: "Reusable task preference"
    });

    state = rejectMemoryCandidate(state, state.memoryCandidates[0].id);

    expect(state.memoryCandidates).toHaveLength(0);
    expect(state.memories).toHaveLength(0);
  });

  it("confirms candidates with reviewed layer, owner, sensitivity, text, and sync policy", () => {
    let state = createInitialState();
    state = proposeMemoryCandidate(state, {
      layer: "task",
      ownerCharacterId: null,
      text: "The user wants task summaries to include validation notes.",
      source: "task-run",
      sensitivity: "low",
      reason: "Reusable task preference"
    });

    state = confirmMemoryCandidate(state, state.memoryCandidates[0].id, {
      layer: "character-private",
      ownerCharacterId: "mira",
      text: "The user prefers validation notes in task summaries.",
      sensitivity: "high",
      syncPolicy: "sync-allowed"
    });

    expect(state.memories[0].layer).toBe("character-private");
    expect(state.memories[0].ownerCharacterId).toBe("mira");
    expect(state.memories[0].text).toBe("The user prefers validation notes in task summaries.");
    expect(state.memories[0].sensitivity).toBe("high");
    expect(state.memories[0].syncPolicy).toBe("local-only");
  });

  it("does not write reviewed memory with an empty text body", () => {
    let state = createInitialState();
    state = proposeMemoryCandidate(state, {
      layer: "shared-world",
      ownerCharacterId: null,
      text: "Useful preference",
      source: "conversation",
      sensitivity: "low",
      reason: "Preference"
    });

    state = confirmMemoryCandidate(state, state.memoryCandidates[0].id, {
      text: "   "
    });

    expect(state.memoryCandidates).toHaveLength(1);
    expect(state.memories).toHaveLength(0);
  });
});
