import { describe, expect, it } from "vitest";
import { createInitialState } from "./defaultState";
import { confirmCharacterDraft, createCharacterDraft, rejectCharacterDraft } from "./characterDrafts";

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
});
