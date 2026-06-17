import { describe, expect, it } from "vitest";
import { createInitialState } from "./defaultState";
import { confirmCharacterDraft, createCharacterDraft, rejectCharacterDraft, createCustomCharacterDraft } from "./characterDrafts";

describe("character draft generation", () => {
  it("creates a draft from text and image metadata without activating it", () => {
    let state = createInitialState();
    state = createCharacterDraft(state, {
      textImport: "A gentle companion who speaks softly and likes quiet encouragement.",
      imageFileName: "mira-reference.png",
      imageMimeType: "image/png",
      imageSizeBytes: 2048
    });

    expect(state.characterDrafts).toHaveLength(1);
    expect(state.characters.some((character) => character.id === state.characterDrafts[0].id)).toBe(false);
    expect(state.characterDrafts[0].disclosures).toContain(
      "Image handling used file metadata only; no vision model is configured."
    );
  });

  it("activates a confirmed draft and discards rejected drafts", () => {
    let state = createInitialState();
    state = createCharacterDraft(state, {
      textImport: "A focused reviewer who checks privacy boundaries.",
      imageFileName: null,
      imageMimeType: null,
      imageSizeBytes: null
    });

    const draftId = state.characterDrafts[0].id;
    state = confirmCharacterDraft(state, draftId);

    expect(state.characterDrafts).toHaveLength(0);
    expect(state.characters.some((character) => character.id === draftId)).toBe(true);

    state = createCharacterDraft(state, {
      textImport: "A quiet observer.",
      imageFileName: null,
      imageMimeType: null,
      imageSizeBytes: null
    });
    state = rejectCharacterDraft(state, state.characterDrafts[0].id);

    expect(state.characterDrafts).toHaveLength(0);
  });

  it("creates a custom draft from AI vision result", () => {
    let state = createInitialState();
    state = createCustomCharacterDraft(state, {
      nameSuggestion: "Aero",
      kind: "task",
      relationshipTemplate: "reviewer",
      personaSummary: "An AI vision analyzed reviewer",
      speakingStyle: "Direct",
      memoryPermissionProfile: ["task"],
      appearanceAccent: "#2563eb",
      sourceText: "AI generated draft from image analysis",
      imageFileName: "aero.png",
      imageMimeType: "image/png",
      imageSizeBytes: 4096,
      disclosures: ["Processed with vision provider"]
    });

    expect(state.characterDrafts).toHaveLength(1);
    expect(state.characterDrafts[0].nameSuggestion).toBe("Aero");
    expect(state.characterDrafts[0].disclosures).toContain("Processed with vision provider");
  });

  it("extracts details from media text template and confirms with custom voice speed and intensity", () => {
    let state = createInitialState();
    state = createCharacterDraft(state, {
      textImport: "Name: Swift\nRelationship: partner\nSpeaking style: Speaks with 1.3x speed and 0.8 emotional intensity.\nAccent: #e11d48\nPersona: An energetic companion.",
      imageFileName: null,
      imageMimeType: null,
      imageSizeBytes: null
    });

    expect(state.characterDrafts).toHaveLength(1);
    const draft = state.characterDrafts[0];
    expect(draft.nameSuggestion).toBe("Swift");
    expect(draft.relationshipTemplate).toBe("partner");
    expect(draft.speakingStyle).toBe("Speaks with 1.3x speed and 0.8 emotional intensity.");
    expect(draft.appearanceAccent).toBe("#e11d48");
    expect(draft.personaSummary).toBe("An energetic companion.");

    state = confirmCharacterDraft(state, draft.id);
    const character = state.characters.find((c) => c.id === draft.id);
    expect(character).toBeDefined();
    expect(character!.voice.speed).toBe(1.3);
    expect(character!.voice.emotionalIntensity).toBe(0.8);
    expect(character!.appearance.accent).toBe("#e11d48");
  });
});
