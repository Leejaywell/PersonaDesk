import { Check, Shield, X } from "lucide-react";
import type { FormEvent } from "react";
import type { AppActions } from "../../app/actions";
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
  function confirmReviewedMemory(event: FormEvent<HTMLFormElement>, candidateId: string) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const ownerCharacterId = String(form.get("ownerCharacterId") ?? "");

    actions.confirmMemoryCandidate(candidateId, {
      layer: String(form.get("layer")) as MemoryLayer,
      ownerCharacterId: ownerCharacterId || null,
      text: String(form.get("text") ?? ""),
      sensitivity: String(form.get("sensitivity")) as Sensitivity,
      syncPolicy: String(form.get("syncPolicy")) as MemoryItem["syncPolicy"]
    });
  }

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
              <article className="review-card" key={candidate.id}>
                <form className="memory-review-form" onSubmit={(event) => confirmReviewedMemory(event, candidate.id)}>
                  <label>
                    Memory text
                    <textarea defaultValue={candidate.proposedText} name="text" />
                  </label>
                  <div className="settings-grid">
                    <label>
                      Layer
                      <select defaultValue={candidate.proposedLayer} name="layer">
                        {memoryLayers.map((layer) => (
                          <option key={layer} value={layer}>
                            {layer}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Owner
                      <select defaultValue={candidate.proposedOwnerCharacterId ?? ""} name="ownerCharacterId">
                        <option value="">Shared</option>
                        {characters.map((character) => (
                          <option key={character.id} value={character.id}>
                            {character.name}
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
                  <div className="button-row">
                    <button type="submit">
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
