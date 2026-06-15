import { describe, expect, it } from "vitest";
import { createInitialState } from "./defaultState";
import { updateCharacterSettings } from "./characters";

describe("character settings", () => {
  it("updates relationship, behavior, memory, appearance, and voice fields", () => {
    const state = createInitialState();
    const next = updateCharacterSettings(state, "mira", {
      customRelationship: "A steady executive partner who remembers private preferences.",
      speakingStyle: "Warm, concise, and direct.",
      memoryPermissionProfile: ["relationship", "preferences", "relationship", " "],
      appearance: {
        avatarLabel: "mx",
        accent: "#336699"
      },
      voice: {
        voiceName: "Soft mezzo",
        speed: 3,
        emotionalIntensity: -1
      },
      proactiveBehavior: {
        frequency: "expressive",
        triggers: ["morning-check-in", "task-delivered", "morning-check-in"],
        doNotDisturb: true
      }
    });

    const mira = next.characters.find((character) => character.id === "mira");

    expect(mira?.customRelationship).toBe("A steady executive partner who remembers private preferences.");
    expect(mira?.speakingStyle).toBe("Warm, concise, and direct.");
    expect(mira?.memoryPermissionProfile).toEqual(["relationship", "preferences"]);
    expect(mira?.appearance.avatarLabel).toBe("MX");
    expect(mira?.appearance.accent).toBe("#336699");
    expect(mira?.voice.voiceName).toBe("Soft mezzo");
    expect(mira?.voice.speed).toBe(2);
    expect(mira?.voice.emotionalIntensity).toBe(0);
    expect(mira?.proactiveBehavior.frequency).toBe("expressive");
    expect(mira?.proactiveBehavior.triggers).toEqual(["morning-check-in", "task-delivered"]);
    expect(mira?.proactiveBehavior.doNotDisturb).toBe(true);
  });

  it("does not let emotional characters adopt executor-capable task boundaries", () => {
    const state = createInitialState();
    const next = updateCharacterSettings(state, "mira", {
      roleBoundaryId: "boundary-task-agent"
    });

    const mira = next.characters.find((character) => character.id === "mira");

    expect(mira?.roleBoundaryId).toBe("boundary-emotional-companion");
  });
});
