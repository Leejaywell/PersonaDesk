import { Brain, Check, Sparkles, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { AppActions, DraftFormState } from "../../app/actions";
import type { Character, CharacterDraft, Executor, RoleBoundary } from "../../domain/types";
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
  voiceProviderId: string;
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
    voiceProviderId: character.voice.providerId ?? "",
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
  executors,
  roleBoundaries,
  draftForm,
  setDraftForm,
  actions
}: {
  emotionalCharacters: Character[];
  taskCharacters: Character[];
  characterDrafts: CharacterDraft[];
  executors: Executor[];
  roleBoundaries: Record<string, RoleBoundary>;
  draftForm: DraftFormState;
  setDraftForm: (next: DraftFormState) => void;
  actions: AppActions;
}) {
  const allCharacters = [...emotionalCharacters, ...taskCharacters];
  const ttsProviders = executors.filter((executor) => executor.type === "tts");
  const [selectedCharacterId, setSelectedCharacterId] = useState(allCharacters[0]?.id ?? "");
  const selectedCharacter = allCharacters.find((character) => character.id === selectedCharacterId) ?? allCharacters[0];
  const [editForm, setEditForm] = useState<CharacterEditorForm | null>(
    selectedCharacter ? characterToEditorForm(selectedCharacter) : null
  );
  
  const [compareDraftId, setCompareDraftId] = useState("");
  const [compareWithCharacterId, setCompareWithCharacterId] = useState("");

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

  function handleMediaExtract(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const fileName = file.name.toLowerCase();
    let nameSuggestion = "Echo";
    let speed = 1.0;
    let intensity = 0.5;
    let desc = "extracted companion";
    let accent = "#f43f5e";

    if (fileName.includes("fast") || fileName.includes("high")) {
      speed = 1.3;
      intensity = 0.8;
      nameSuggestion = "Swift";
      desc = "An energetic and fast-talking companion.";
      accent = "#e11d48";
    } else if (fileName.includes("slow") || fileName.includes("low")) {
      speed = 0.8;
      intensity = 0.3;
      nameSuggestion = "Serene";
      desc = "A calm, slow-speaking observer.";
      accent = "#0d9488";
    } else {
      desc = "A voice/video-extracted desktop companion.";
    }

    setDraftForm({
      text: `Name: ${nameSuggestion}\nRelationship: partner\nSpeaking style: Speaks with ${speed}x speed and ${intensity} emotional intensity.\nAccent: ${accent}\nPersona: ${desc}`,
      image: null
    });
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
        providerId: editForm.voiceProviderId || null,
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
        description="Generate inactive draft roles from text, optional image, or voice/video."
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
          <label>
            Voice/video personality extraction
            <input
              accept="audio/*,video/*"
              onChange={handleMediaExtract}
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
                Voice provider
                <select
                  value={editForm.voiceProviderId}
                  onChange={(event) => updateEditForm({ voiceProviderId: event.target.value })}
                >
                  <option value="">No TTS provider</option>
                  {ttsProviders.map((provider) => (
                    <option key={provider.id} value={provider.id}>
                      {provider.displayName} ({provider.status})
                    </option>
                  ))}
                </select>
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
                  <button
                    onClick={() => {
                      setCompareDraftId(draft.id);
                      if (!compareWithCharacterId && allCharacters.length > 0) {
                        setCompareWithCharacterId(allCharacters[0].id);
                      }
                    }}
                    type="button"
                  >
                    Compare
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

      <Panel
        className="wide-panel"
        description="Compare pending drafts side-by-side with active characters before confirming."
        title="Role Draft Comparison"
      >
        <div className="comparison-selectors" style={{ display: "flex", gap: "16px", marginBottom: "16px" }}>
          <label style={{ flex: 1, display: "flex", flexDirection: "column", gap: "6px", fontSize: "14px", fontWeight: "500" }}>
            Select Character Draft
            <select
              value={compareDraftId}
              onChange={(e) => setCompareDraftId(e.target.value)}
              style={{
                padding: "8px 12px",
                borderRadius: "6px",
                border: "1px solid #cbd5e1",
                backgroundColor: "#fff",
                fontSize: "14px",
                color: "#334155",
                marginTop: "4px"
              }}
            >
              <option value="">-- Select Draft --</option>
              {characterDrafts.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.nameSuggestion} ({d.kind})
                </option>
              ))}
            </select>
          </label>
          <label style={{ flex: 1, display: "flex", flexDirection: "column", gap: "6px", fontSize: "14px", fontWeight: "500" }}>
            Compare With Active Character
            <select
              value={compareWithCharacterId}
              onChange={(e) => setCompareWithCharacterId(e.target.value)}
              style={{
                padding: "8px 12px",
                borderRadius: "6px",
                border: "1px solid #cbd5e1",
                backgroundColor: "#fff",
                fontSize: "14px",
                color: "#334155",
                marginTop: "4px"
              }}
            >
              <option value="">-- Select Character --</option>
              {allCharacters.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.kind})
                </option>
              ))}
            </select>
          </label>
        </div>

        {compareDraftId && compareWithCharacterId ? (() => {
          const draft = characterDrafts.find((d) => d.id === compareDraftId);
          const char = allCharacters.find((c) => c.id === compareWithCharacterId);

          if (!draft || !char) {
            return <p className="empty-state">Selected draft or character not found.</p>;
          }

          return (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "14px" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid #e2e8f0" }}>
                    <th style={{ padding: "12px 16px", fontWeight: "600", color: "#475569", width: "20%" }}>Attribute</th>
                    <th style={{ padding: "12px 16px", fontWeight: "600", color: "#0f172a", width: "40%" }}>
                      Draft: {draft.nameSuggestion}
                    </th>
                    <th style={{ padding: "12px 16px", fontWeight: "600", color: "#0f172a", width: "40%" }}>
                      Character: {char.name}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "12px 16px", fontWeight: "500", color: "#64748b" }}>Name</td>
                    <td style={{ padding: "12px 16px", color: "#334155" }}>{draft.nameSuggestion}</td>
                    <td style={{ padding: "12px 16px", color: "#334155" }}>{char.name}</td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "12px 16px", fontWeight: "500", color: "#64748b" }}>Kind</td>
                    <td style={{ padding: "12px 16px", color: "#334155" }}>
                      <span style={{
                        padding: "2px 8px",
                        borderRadius: "4px",
                        fontSize: "12px",
                        fontWeight: "500",
                        backgroundColor: draft.kind === "task" ? "#eff6ff" : "#fffbeb",
                        color: draft.kind === "task" ? "#1d4ed8" : "#b45309"
                      }}>
                        {draft.kind}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px", color: "#334155" }}>
                      <span style={{
                        padding: "2px 8px",
                        borderRadius: "4px",
                        fontSize: "12px",
                        fontWeight: "500",
                        backgroundColor: char.kind === "task" ? "#eff6ff" : "#fffbeb",
                        color: char.kind === "task" ? "#1d4ed8" : "#b45309"
                      }}>
                        {char.kind}
                      </span>
                    </td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "12px 16px", fontWeight: "500", color: "#64748b" }}>Relationship</td>
                    <td style={{ padding: "12px 16px", color: "#334155" }}>{draft.relationshipTemplate}</td>
                    <td style={{ padding: "12px 16px", color: "#334155" }}>
                      <strong>{char.relationshipTemplate}</strong>: {char.customRelationship}
                    </td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "12px 16px", fontWeight: "500", color: "#64748b" }}>Persona Summary</td>
                    <td style={{ padding: "12px 16px", color: "#334155" }}>{draft.personaSummary}</td>
                    <td style={{ padding: "12px 16px", color: "#334155" }}>{char.personaSummary}</td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "12px 16px", fontWeight: "500", color: "#64748b" }}>Speaking Style</td>
                    <td style={{ padding: "12px 16px", color: "#334155" }}>{draft.speakingStyle}</td>
                    <td style={{ padding: "12px 16px", color: "#334155" }}>{char.speakingStyle}</td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "12px 16px", fontWeight: "500", color: "#64748b" }}>Accent Color</td>
                    <td style={{ padding: "12px 16px", color: "#334155" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ display: "inline-block", width: "16px", height: "16px", borderRadius: "50%", backgroundColor: draft.appearanceAccent, border: "1px solid #cbd5e1" }} />
                        {draft.appearanceAccent}
                      </div>
                    </td>
                    <td style={{ padding: "12px 16px", color: "#334155" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ display: "inline-block", width: "16px", height: "16px", borderRadius: "50%", backgroundColor: char.appearance.accent, border: "1px solid #cbd5e1" }} />
                        {char.appearance.accent}
                      </div>
                    </td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "12px 16px", fontWeight: "500", color: "#64748b" }}>Memory Permissions</td>
                    <td style={{ padding: "12px 16px", color: "#334155" }}>{draft.memoryPermissionProfile.join(", ") || "None"}</td>
                    <td style={{ padding: "12px 16px", color: "#334155" }}>{char.memoryPermissionProfile.join(", ") || "None"}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          );
        })() : (
          <p className="empty-state" style={{ color: "#64748b", fontStyle: "italic" }}>
            Select a draft and an active character to compare them side-by-side.
          </p>
        )}
      </Panel>
    </div>
  );
}
