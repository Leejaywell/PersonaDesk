import { describe, expect, it } from "vitest";
import { createInitialState } from "./defaultState";
import { deserializeState, serializeState } from "./storage";

describe("state storage", () => {
  it("round-trips the current state version", () => {
    const state = createInitialState();
    const serialized = serializeState(state);
    const restored = deserializeState(serialized);

    expect(restored.characters.map((character) => character.id)).toEqual(
      state.characters.map((character) => character.id)
    );
    expect(restored.syncProfile.enabled).toBe(false);
  });

  it("falls back to a safe initial state for unknown versions", () => {
    const restored = deserializeState(JSON.stringify({ version: 999, state: { characters: [] } }));

    expect(restored.characters.length).toBeGreaterThan(0);
    expect(restored.syncProfile.enabled).toBe(false);
  });
});
