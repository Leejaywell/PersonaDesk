import { Check, Shield, X } from "lucide-react";
import type { AppActions } from "../../app/actions";
import type { MemoryCandidate, MemoryItem } from "../../domain/types";
import { Panel } from "../ui/Panel";

export function MemoryCenterPage({
  memoryCandidates,
  memories,
  actions
}: {
  memoryCandidates: MemoryCandidate[];
  memories: MemoryItem[];
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
              <article className="review-card" key={candidate.id}>
                <p>{candidate.proposedText}</p>
                <small>{candidate.reason}</small>
                <div className="button-row">
                  <button onClick={() => actions.confirmMemoryCandidate(candidate.id)} type="button">
                    <Check aria-hidden="true" size={15} />
                    Confirm
                  </button>
                  <button onClick={() => actions.rejectMemoryCandidate(candidate.id)} type="button">
                    <X aria-hidden="true" size={15} />
                    Reject
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </Panel>

      <Panel description="Confirmed memories are durable; rejected candidates are discarded." title="Confirmed Memory">
        <p className="memory-count">Confirmed memories: {memories.length}</p>
        <div className="memory-layer-list">
          {["user-profile", "shared-world", "character-private", "task", "short-term", "import-summary"].map((layer) => (
            <span className="meta-chip" key={layer}>
              {layer}: {memories.filter((memory) => memory.layer === layer).length}
            </span>
          ))}
        </div>
      </Panel>
    </div>
  );
}
