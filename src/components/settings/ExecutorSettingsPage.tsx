import { Bot, Mic, Search } from "lucide-react";
import type { AppActions } from "../../app/actions";
import { executorDisclosure } from "../../domain/executors";
import type { Executor } from "../../domain/types";
import { Panel } from "../ui/Panel";
import { StatusPill } from "../ui/StatusPill";
import { VoiceSettingsPanel } from "./VoiceSettingsPanel";

export function ExecutorSettingsPage({
  actions,
  executors,
  scanStatus
}: {
  actions: AppActions;
  executors: Executor[];
  scanStatus: string;
}) {
  const voiceExecutors = executors.filter((executor) => executor.type === "asr" || executor.type === "tts");

  return (
    <div className="page-grid executor-page">
      <Panel
        className="primary-page-panel"
        description="Model APIs, local models, local agents, and deterministic tools share one capability registry."
        icon={<Bot aria-hidden="true" size={19} />}
        title="Executor Registry"
      >
        <div className="executor-toolbar">
          <div>
            <strong>Local agent detection</strong>
            <p>{scanStatus}</p>
          </div>
          <button onClick={() => void actions.scanLocalAgents()} type="button">
            <Search aria-hidden="true" size={15} />
            Scan local agents
          </button>
        </div>
        <div className="executor-list">
          {executors.map((executor) => (
            <article className="executor-row" key={executor.id}>
              <div>
                <strong>{executor.displayName}</strong>
                <p>{executorDisclosure(executor)}</p>
              </div>
              <StatusPill status={executor.status} />
            </article>
          ))}
        </div>
      </Panel>

      <Panel
        description="ASR/TTS provider slots are explicit and unconfigured by default."
        icon={<Mic aria-hidden="true" size={19} />}
        title="Voice Providers"
      >
        <VoiceSettingsPanel voiceExecutors={voiceExecutors} />
      </Panel>
    </div>
  );
}
