import { Brain, Check, Sparkles, X } from "lucide-react";
import type { AppActions, DraftFormState } from "../../app/actions";
import type { Character, CharacterDraft, RoleBoundary } from "../../domain/types";
import { Panel } from "../ui/Panel";
import { StatusPill } from "../ui/StatusPill";
import { CharacterCard } from "./CharacterCard";

export function CharacterStudioPage({
  emotionalCharacters,
  taskCharacters,
  characterDrafts,
  roleBoundaries,
  draftForm,
  setDraftForm,
  actions
}: {
  emotionalCharacters: Character[];
  taskCharacters: Character[];
  characterDrafts: CharacterDraft[];
  roleBoundaries: Record<string, RoleBoundary>;
  draftForm: DraftFormState;
  setDraftForm: (next: DraftFormState) => void;
  actions: AppActions;
}) {
  return (
    <div className="page-grid character-studio-page">
      <Panel
        className="primary-page-panel"
        description="Generate inactive draft roles from text and optional image metadata."
        icon={<Sparkles aria-hidden="true" size={19} />}
        title="Character Studio"
      >
        <form className="draft-form" onSubmit={actions.generateCharacterDraft}>
          <label>
            Text import
            <textarea
              value={draftForm.text}
              onChange={(event) => setDraftForm({ ...draftForm, text: event.target.value })}
              placeholder="Describe the character's personality, tone, boundaries, and relationship."
            />
          </label>
          <label>
            Optional image file
            <input
              accept="image/*"
              onChange={(event) => setDraftForm({ ...draftForm, image: event.target.files?.[0] ?? null })}
              type="file"
            />
          </label>
          <button className="primary-button" type="submit">
            <Sparkles aria-hidden="true" size={16} />
            Generate character draft
          </button>
        </form>
      </Panel>

      <Panel description="Relationship roles stay separate from task execution." icon={<Brain aria-hidden="true" size={19} />} title="Emotional Characters">
        <div className="card-list">
          {emotionalCharacters.map((character) => (
            <CharacterCard
              boundaryLabel={roleBoundaries[character.roleBoundaryId].label}
              character={character}
              key={character.id}
            />
          ))}
        </div>
      </Panel>

      <Panel description="Operational roles use explicit executor permissions." title="Task Characters">
        <div className="card-list">
          {taskCharacters.map((character) => (
            <CharacterCard
              boundaryLabel={roleBoundaries[character.roleBoundaryId].label}
              character={character}
              key={character.id}
            />
          ))}
        </div>
      </Panel>

      <Panel
        className="wide-panel"
        description="Drafts must be confirmed before they become active characters."
        title="Pending Drafts"
      >
        {characterDrafts.length === 0 ? (
          <p className="empty-state">No pending character drafts.</p>
        ) : (
          <div className="card-list">
            {characterDrafts.map((draft) => (
              <article className="review-card" key={draft.id}>
                <div className="task-card-header">
                  <div>
                    <h3>{draft.nameSuggestion}</h3>
                    <p>{draft.personaSummary}</p>
                  </div>
                  <StatusPill>{draft.kind}</StatusPill>
                </div>
                <p>{draft.speakingStyle}</p>
                {draft.imageFileName && (
                  <p>
                    Image metadata: {draft.imageFileName}, {draft.imageMimeType ?? "unknown type"},{" "}
                    {draft.imageSizeBytes ?? 0} bytes
                  </p>
                )}
                <div className="disclosure-list">
                  {draft.disclosures.map((disclosure) => (
                    <p key={disclosure}>{disclosure}</p>
                  ))}
                </div>
                <div className="button-row">
                  <button onClick={() => actions.confirmCharacterDraft(draft.id)} type="button">
                    <Check aria-hidden="true" size={15} />
                    Confirm character
                  </button>
                  <button onClick={() => actions.rejectCharacterDraft(draft.id)} type="button">
                    <X aria-hidden="true" size={15} />
                    Reject draft
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}
