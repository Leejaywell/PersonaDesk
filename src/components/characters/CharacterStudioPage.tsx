import { Brain, Check, Sparkles, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { AppActions, DraftFormState } from "../../app/actions";
import type { Character, CharacterDraft, RoleBoundary } from "../../domain/types";
import { Panel } from "../ui/Panel";
import { StatusPill } from "../ui/StatusPill";
import { CharacterCard } from "./CharacterCard";

interface CharacterEditorForm {
  name: string;
  relationshipTemplate: string;
  customRelationship: string;
  speakingStyle: string;
  roleBoundaryId: string;
  proactiveFrequency: Character["proactiveBehavior"]["frequency"];
  proactiveTriggers: string;
  doNotDisturb: boolean;
  appearanceBackend: Character["appearance"]["backend"];
  avatarLabel: string;
  accent: string;
  voiceName: string;
  voiceSpeed: number;
  emotionalIntensity: number;
  memoryPermissions: string;
}

function characterToEditorForm(character: Character): CharacterEditorForm {
  return {
    name: character.name,
    relationshipTemplate: character.relationshipTemplate,
    customRelationship: character.customRelationship,
    speakingStyle: character.speakingStyle,
    roleBoundaryId: character.roleBoundaryId,
    proactiveFrequency: character.proactiveBehavior.frequency,
    proactiveTriggers: character.proactiveBehavior.triggers.join(", "),
    doNotDisturb: character.proactiveBehavior.doNotDisturb,
    appearanceBackend: character.appearance.backend,
    avatarLabel: character.appearance.avatarLabel,
    accent: character.appearance.accent,
    voiceName: character.voice.voiceName,
    voiceSpeed: character.voice.speed,
    emotionalIntensity: character.voice.emotionalIntensity,
    memoryPermissions: character.memoryPermissionProfile.join(", ")
  };
}

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
  const allCharacters = [...emotionalCharacters, ...taskCharacters];
  const [selectedCharacterId, setSelectedCharacterId] = useState(allCharacters[0]?.id ?? "");
  const selectedCharacter = allCharacters.find((character) => character.id === selectedCharacterId) ?? allCharacters[0];
  const [editForm, setEditForm] = useState<CharacterEditorForm | null>(
    selectedCharacter ? characterToEditorForm(selectedCharacter) : null
  );

  const availableBoundaries = selectedCharacter
    ? Object.values(roleBoundaries).filter((boundary) =>
        selectedCharacter.kind === "task" ? boundary.canCallExecutors : !boundary.canCallExecutors
      )
    : [];

  useEffect(() => {
    setEditForm(selectedCharacter ? characterToEditorForm(selectedCharacter) : null);
  }, [selectedCharacter?.id]);

  function updateEditForm(update: Partial<CharacterEditorForm>) {
    setEditForm((current) => (current ? { ...current, ...update } : current));
  }

  function saveCharacterSettings() {
    if (!selectedCharacter || !editForm) {
      return;
    }

    actions.updateCharacterSettings(selectedCharacter.id, {
      name: editForm.name,
      relationshipTemplate: editForm.relationshipTemplate,
      customRelationship: editForm.customRelationship,
      speakingStyle: editForm.speakingStyle,
      roleBoundaryId: editForm.roleBoundaryId,
      memoryPermissionProfile: editForm.memoryPermissions.split(","),
      appearance: {
        backend: editForm.appearanceBackend,
        avatarLabel: editForm.avatarLabel,
        accent: editForm.accent
      },
      voice: {
        voiceName: editForm.voiceName,
        speed: editForm.voiceSpeed,
        emotionalIntensity: editForm.emotionalIntensity
      },
      proactiveBehavior: {
        frequency: editForm.proactiveFrequency,
        triggers: editForm.proactiveTriggers.split(","),
        doNotDisturb: editForm.doNotDisturb
      }
    });
  }

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

      <Panel
        className="primary-page-panel"
        description="Edit relationship, behavior, memory, appearance, voice, and permission boundary settings."
        title="Character Settings"
      >
        {selectedCharacter && editForm ? (
          <form
            className="character-settings-editor"
            onSubmit={(event) => {
              event.preventDefault();
              saveCharacterSettings();
            }}
          >
            <div className="character-select-row" aria-label="Choose character to edit">
              {allCharacters.map((character) => (
                <button
                  className={character.id === selectedCharacter.id ? "selected" : ""}
                  key={character.id}
                  onClick={() => setSelectedCharacterId(character.id)}
                  type="button"
                >
                  <span className="mini-avatar" style={{ backgroundColor: character.appearance.accent }}>
                    {character.appearance.avatarLabel}
                  </span>
                  {character.name}
                </button>
              ))}
            </div>

            <div className="settings-grid">
              <label>
                Name
                <input value={editForm.name} onChange={(event) => updateEditForm({ name: event.target.value })} />
              </label>
              <label>
                Relationship template
                <input
                  value={editForm.relationshipTemplate}
                  onChange={(event) => updateEditForm({ relationshipTemplate: event.target.value })}
                />
              </label>
              <label className="wide-field">
                Custom relationship
                <textarea
                  value={editForm.customRelationship}
                  onChange={(event) => updateEditForm({ customRelationship: event.target.value })}
                />
              </label>
              <label className="wide-field">
                Speaking style
                <textarea
                  value={editForm.speakingStyle}
                  onChange={(event) => updateEditForm({ speakingStyle: event.target.value })}
                />
              </label>
              <label>
                Role boundary
                <select
                  value={editForm.roleBoundaryId}
                  onChange={(event) => updateEditForm({ roleBoundaryId: event.target.value })}
                >
                  {availableBoundaries.map((boundary) => (
                    <option key={boundary.id} value={boundary.id}>
                      {boundary.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Proactive frequency
                <select
                  value={editForm.proactiveFrequency}
                  onChange={(event) =>
                    updateEditForm({
                      proactiveFrequency: event.target.value as Character["proactiveBehavior"]["frequency"]
                    })
                  }
                >
                  <option value="quiet">quiet</option>
                  <option value="balanced">balanced</option>
                  <option value="expressive">expressive</option>
                </select>
              </label>
              <label className="wide-field">
                Proactive triggers
                <input
                  value={editForm.proactiveTriggers}
                  onChange={(event) => updateEditForm({ proactiveTriggers: event.target.value })}
                />
              </label>
              <label className="toggle-row">
                <input
                  checked={editForm.doNotDisturb}
                  onChange={(event) => updateEditForm({ doNotDisturb: event.target.checked })}
                  type="checkbox"
                />
                Do not disturb
              </label>
              <label>
                Appearance backend
                <select
                  value={editForm.appearanceBackend}
                  onChange={(event) =>
                    updateEditForm({ appearanceBackend: event.target.value as Character["appearance"]["backend"] })
                  }
                >
                  <option value="static">static</option>
                  <option value="state-pack">state-pack</option>
                  <option value="live2d-reserved">live2d-reserved</option>
                  <option value="spine-reserved">spine-reserved</option>
                </select>
              </label>
              <label>
                Avatar label
                <input
                  maxLength={2}
                  value={editForm.avatarLabel}
                  onChange={(event) => updateEditForm({ avatarLabel: event.target.value })}
                />
              </label>
              <label>
                Accent
                <input
                  type="color"
                  value={editForm.accent}
                  onChange={(event) => updateEditForm({ accent: event.target.value })}
                />
              </label>
              <label>
                Voice name
                <input value={editForm.voiceName} onChange={(event) => updateEditForm({ voiceName: event.target.value })} />
              </label>
              <label>
                Voice speed
                <input
                  max={2}
                  min={0.5}
                  onChange={(event) => updateEditForm({ voiceSpeed: Number(event.target.value) })}
                  step={0.05}
                  type="number"
                  value={editForm.voiceSpeed}
                />
              </label>
              <label>
                Emotional intensity
                <input
                  max={1}
                  min={0}
                  onChange={(event) => updateEditForm({ emotionalIntensity: Number(event.target.value) })}
                  step={0.05}
                  type="number"
                  value={editForm.emotionalIntensity}
                />
              </label>
              <label className="wide-field">
                Memory permissions
                <input
                  value={editForm.memoryPermissions}
                  onChange={(event) => updateEditForm({ memoryPermissions: event.target.value })}
                />
              </label>
              <button className="primary-button wide-field" type="submit">
                <Check aria-hidden="true" size={16} />
                Save character settings
              </button>
            </div>
          </form>
        ) : (
          <p className="empty-state">No characters to edit.</p>
        )}
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
