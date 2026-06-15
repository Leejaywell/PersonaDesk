import { Mic, Volume2 } from "lucide-react";
import type { Executor } from "../../domain/types";
import { StatusPill } from "../ui/StatusPill";

export function VoiceSettingsPanel({ voiceExecutors }: { voiceExecutors: Executor[] }) {
  return (
    <div className="executor-list">
      {voiceExecutors.map((executor) => (
        <article className="executor-row" key={executor.id}>
          <div>
            <strong>{executor.displayName}</strong>
            <p>{executor.statusReason}</p>
          </div>
          <div className="executor-status-row">
            {executor.type === "tts" ? <Volume2 aria-hidden="true" size={18} /> : <Mic aria-hidden="true" size={18} />}
            <StatusPill status={executor.status} />
          </div>
        </article>
      ))}
    </div>
  );
}
