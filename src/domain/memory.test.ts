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
});
