import { Check, Shield, X } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import type { AppActions } from "../../app/actions";
import { canCharacterOwnMemoryLayer, canUseSharedMemoryOwner } from "../../domain/memory";
import type { Character, MemoryCandidate, MemoryItem, MemoryLayer, Sensitivity } from "../../domain/types";
import { Panel } from "../ui/Panel";

const memoryLayers: MemoryLayer[] = [
  "user-profile",
  "shared-world",
  "character-private",
  "task",
  "short-term",
  "import-summary"
];

const sensitivityOptions: Sensitivity[] = ["low", "medium", "high"];

function ownerName(characters: Character[], ownerCharacterId: string | null): string {
  if (!ownerCharacterId) {
    return "Shared";
  }

  return characters.find((character) => character.id === ownerCharacterId)?.name ?? ownerCharacterId;
}

function ownerOptionsForLayer(characters: Character[], layer: MemoryLayer) {
  const sharedOption = canUseSharedMemoryOwner(layer) ? [{ label: "Shared", value: "" }] : [];
  const characterOptions = characters
    .filter((character) => canCharacterOwnMemoryLayer(character, layer))
    .map((character) => ({ label: character.name, value: character.id }));

  return [...sharedOption, ...characterOptions];
}

function defaultOwnerForLayer(characters: Character[], layer: MemoryLayer, proposedOwnerCharacterId: string | null): string {
  const options = ownerOptionsForLayer(characters, layer);

  return options.some((option) => option.value === (proposedOwnerCharacterId ?? ""))
    ? (proposedOwnerCharacterId ?? "")
    : (options[0]?.value ?? "");
}

function MemoryCandidateReviewCard({
  actions,
  candidate,
  characters
}: {
  actions: AppActions;
  candidate: MemoryCandidate;
  characters: Character[];
}) {
  const [layer, setLayer] = useState<MemoryLayer>(candidate.proposedLayer);
  const [ownerCharacterId, setOwnerCharacterId] = useState(() =>
    defaultOwnerForLayer(characters, candidate.proposedLayer, candidate.proposedOwnerCharacterId)
  );
  const ownerOptions = useMemo(() => ownerOptionsForLayer(characters, layer), [characters, layer]);
  const canConfirm = ownerOptions.length > 0;

  function changeLayer(nextLayer: MemoryLayer) {
    const nextOwnerOptions = ownerOptionsForLayer(characters, nextLayer);

    setLayer(nextLayer);
    setOwnerCharacterId(
      nextOwnerOptions.some((option) => option.value === ownerCharacterId)
        ? ownerCharacterId
        : (nextOwnerOptions[0]?.value ?? "")
    );
  }

  function confirmReviewedMemory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    actions.confirmMemoryCandidate(candidate.id, {
      layer,
      ownerCharacterId: ownerCharacterId || null,
      text: String(form.get("text") ?? ""),
      sensitivity: String(form.get("sensitivity")) as Sensitivity,
      syncPolicy: String(form.get("syncPolicy")) as MemoryItem["syncPolicy"]
    });
  }

  return (
    <article className="review-card">
      <form className="memory-review-form" onSubmit={confirmReviewedMemory}>
        <label>
          Memory text
          <textarea defaultValue={candidate.proposedText} name="text" />
        </label>
        <div className="settings-grid">
          <label>
            Layer
            <select value={layer} onChange={(event) => changeLayer(event.target.value as MemoryLayer)} name="layer">
              {memoryLayers.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label>
            Owner
            <select
              disabled={!canConfirm}
              value={ownerCharacterId}
              onChange={(event) => setOwnerCharacterId(event.target.value)}
              name="ownerCharacterId"
            >
              {ownerOptions.map((option) => (
                <option key={option.value || "shared"} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Sensitivity
            <select defaultValue={candidate.sensitivity} name="sensitivity">
              {sensitivityOptions.map((sensitivity) => (
                <option key={sensitivity} value={sensitivity}>
                  {sensitivity}
                </option>
              ))}
            </select>
          </label>
          <label>
            Sync policy
            <select defaultValue={candidate.sensitivity === "high" ? "local-only" : "sync-allowed"} name="syncPolicy">
              <option value="sync-allowed">sync-allowed</option>
              <option value="local-only">local-only</option>
            </select>
          </label>
        </div>
        <small>{candidate.reason}</small>
        {!canConfirm ? <p className="empty-state">No role has permission to own this memory layer.</p> : null}
        <div className="button-row">
          <button disabled={!canConfirm} type="submit">
            <Check aria-hidden="true" size={15} />
            Confirm reviewed memory
          </button>
          <button onClick={() => actions.rejectMemoryCandidate(candidate.id)} type="button">
            <X aria-hidden="true" size={15} />
            Reject
          </button>
        </div>
      </form>
    </article>
  );
}

export function MemoryCenterPage({
  memoryCandidates,
  memories,
  characters,
  actions
}: {
  memoryCandidates: MemoryCandidate[];
  memories: MemoryItem[];
  characters: Character[];
  actions: AppActions;
}) {
  return (
    <div className="page-grid memory-page">
      <Panel
        className="primary-page-panel"
        description="Candidates require confirmation before long-term write."
        icon={<Shield aria-hidden="true" size={19} />}
        title="Memory Center"
      >
        {memoryCandidates.length === 0 ? (
          <p className="empty-state">No pending memory candidates.</p>
        ) : (
          <div className="card-list">
            {memoryCandidates.map((candidate) => (
              <MemoryCandidateReviewCard actions={actions} candidate={candidate} characters={characters} key={candidate.id} />
            ))}
          </div>
        )}
      </Panel>

      <Panel description="Confirmed memories are durable; rejected candidates are discarded." title="Confirmed Memory">
        <p className="memory-count">Confirmed memories: {memories.length}</p>
        <div className="memory-layer-list">
          {memoryLayers.map((layer) => (
            <span className="meta-chip" key={layer}>
              {layer}: {memories.filter((memory) => memory.layer === layer).length}
            </span>
          ))}
        </div>
        {memories.length > 0 && (
          <div className="card-list memory-item-list">
            {memories.map((memory) => (
              <article className="review-card" key={memory.id}>
                <p>{memory.text}</p>
                <div className="meta-row">
                  <span>{memory.layer}</span>
                  <span>{ownerName(characters, memory.ownerCharacterId)}</span>
                  <span>{memory.sensitivity}</span>
                  <span>{memory.syncPolicy}</span>
                </div>
              </article>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}
