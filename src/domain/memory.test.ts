import { describe, expect, it } from "vitest";
import { createInitialState } from "./defaultState";
import { createTask, runAutonomyCycle } from "./tasks";
import { buildMemoryContextPreview, confirmMemoryCandidate, proposeMemoryCandidate, rejectMemoryCandidate } from "./memory";

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

  it("prevents task characters from owning private emotional memory", () => {
    let state = createInitialState();
    state = proposeMemoryCandidate(state, {
      layer: "task",
      ownerCharacterId: null,
      text: "The user prefers validation notes in task summaries.",
      source: "task-run",
      sensitivity: "low",
      reason: "Reusable task preference"
    });

    state = confirmMemoryCandidate(state, state.memoryCandidates[0].id, {
      layer: "character-private",
      ownerCharacterId: "orion"
    });

    expect(state.memoryCandidates).toHaveLength(1);
    expect(state.memories).toHaveLength(0);
  });

  it("requires an owner for character-private memories", () => {
    let state = createInitialState();
    state = proposeMemoryCandidate(state, {
      layer: "character-private",
      ownerCharacterId: null,
      text: "The user likes quiet encouragement.",
      source: "conversation",
      sensitivity: "low",
      reason: "Relationship preference"
    });

    state = confirmMemoryCandidate(state, state.memoryCandidates[0].id);

    expect(state.memoryCandidates).toHaveLength(1);
    expect(state.memories).toHaveLength(0);
  });

  it("allows task characters to own task-scoped memories", () => {
    let state = createInitialState();
    state = proposeMemoryCandidate(state, {
      layer: "task",
      ownerCharacterId: "orion",
      text: "Use validation notes in task summaries.",
      source: "task-run",
      sensitivity: "low",
      reason: "Reusable task preference"
    });

    state = confirmMemoryCandidate(state, state.memoryCandidates[0].id);

    expect(state.memoryCandidates).toHaveLength(0);
    expect(state.memories[0].layer).toBe("task");
    expect(state.memories[0].ownerCharacterId).toBe("orion");
  });

  it("builds selective context without leaking private or high-sensitivity memory", () => {
    let state = createInitialState();
    state = proposeMemoryCandidate(state, {
      layer: "shared-world",
      ownerCharacterId: null,
      text: "The user prefers concise summaries.",
      source: "conversation",
      sensitivity: "low",
      reason: "Stable preference"
    });
    state = confirmMemoryCandidate(state, state.memoryCandidates[0].id);
    state = proposeMemoryCandidate(state, {
      layer: "character-private",
      ownerCharacterId: "mira",
      text: "Mira remembers the user's quiet encouragement preference.",
      source: "conversation",
      sensitivity: "low",
      reason: "Relationship memory"
    });
    state = confirmMemoryCandidate(state, state.memoryCandidates[0].id);
    state = proposeMemoryCandidate(state, {
      layer: "character-private",
      ownerCharacterId: "sol",
      text: "Sol has a separate private observation.",
      source: "conversation",
      sensitivity: "low",
      reason: "Relationship memory"
    });
    state = confirmMemoryCandidate(state, state.memoryCandidates[0].id);
    state = proposeMemoryCandidate(state, {
      layer: "user-profile",
      ownerCharacterId: null,
      text: "Highly sensitive user profile detail.",
      source: "conversation",
      sensitivity: "high",
      reason: "Sensitive profile"
    });
    state = confirmMemoryCandidate(state, state.memoryCandidates[0].id);

    const preview = buildMemoryContextPreview(state, { characterId: "mira" });
    const taskOnlyPreview = buildMemoryContextPreview(state, { characterId: "vale" });

    expect(preview.included.map((item) => item.text)).toContain("The user prefers concise summaries.");
    expect(preview.included.map((item) => item.text)).toContain("Mira remembers the user's quiet encouragement preference.");
    expect(preview.included.map((item) => item.text)).not.toContain("Sol has a separate private observation.");
    expect(preview.included.map((item) => item.text)).not.toContain("Highly sensitive user profile detail.");
    expect(taskOnlyPreview.included.map((item) => item.text)).not.toContain("The user prefers concise summaries.");
    expect(taskOnlyPreview.excluded.some((item) => item.reason.includes("shared-world memory permission"))).toBe(true);
    expect(preview.excluded.some((item) => item.reason.includes("High-sensitivity"))).toBe(true);
    expect(preview.disclosure).toContain("does not inject every memory");
  });

  it("includes task memory only for the selected task context", () => {
    let state = createInitialState();
    state = createTask(state, {
      goal: "Create task context checklist",
      constraints: "Keep it local",
      desiredOutput: "Checklist",
      supervisionMode: "unsupervised",
      authorizationScope: "text-planning-only",
      allowedExecutorIds: ["local-planner"]
    });
    state = runAutonomyCycle(state, state.tasks[0].id);
    state = confirmMemoryCandidate(state, state.memoryCandidates[0].id, {
      layer: "task",
      ownerCharacterId: null
    });

    const taskPreview = buildMemoryContextPreview(state, {
      characterId: "orion",
      taskId: state.tasks[0].id
    });
    const unrelatedPreview = buildMemoryContextPreview(state, {
      characterId: "orion",
      taskId: "task-missing"
    });
    const emotionalPreview = buildMemoryContextPreview(state, {
      characterId: "mira",
      taskId: state.tasks[0].id
    });

    expect(taskPreview.included.some((item) => item.layer === "task")).toBe(true);
    expect(unrelatedPreview.included.some((item) => item.layer === "task")).toBe(false);
    expect(emotionalPreview.included.some((item) => item.layer === "task")).toBe(false);
    expect(emotionalPreview.excluded.some((item) => item.reason.includes("task memory permission"))).toBe(true);
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
