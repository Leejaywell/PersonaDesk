import { Bot, Mic, Search } from "lucide-react";
import type { FormEvent } from "react";
import type { AppActions } from "../../app/actions";
import { executorDisclosure } from "../../domain/executors";
import type { Executor, VoiceRequest } from "../../domain/types";
import { Panel } from "../ui/Panel";
import { StatusPill } from "../ui/StatusPill";
import { VoiceSettingsPanel } from "./VoiceSettingsPanel";

export function ExecutorSettingsPage({
  actions,
  executors,
  scanStatus,
  voiceRequests
}: {
  actions: AppActions;
  executors: Executor[];
  scanStatus: string;
  voiceRequests: VoiceRequest[];
}) {
  const voiceExecutors = executors.filter((executor) => executor.type === "asr" || executor.type === "tts");
  const configurableExecutors = executors.filter(
    (executor) => executor.type !== "deterministic" && executor.type !== "local-agent"
  );

  function saveExecutorConfiguration(event: FormEvent<HTMLFormElement>, executorId: string) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    actions.configureExecutor(executorId, {
      endpoint: String(form.get("endpoint") ?? ""),
      model: String(form.get("model") ?? ""),
      secretRef: String(form.get("secretRef") ?? ""),
      notes: String(form.get("notes") ?? "")
    });
  }

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
        className="wide-panel"
        description="Save provider metadata without storing raw secrets or marking providers as verified."
        title="Provider Configuration"
      >
        <div className="executor-config-list">
          {configurableExecutors.map((executor) => (
            <form
              className="executor-config-card"
              key={executor.id}
              onSubmit={(event) => saveExecutorConfiguration(event, executor.id)}
            >
              <div className="task-card-header">
                <div>
                  <h3>{executor.displayName}</h3>
                  <p>{executor.statusReason}</p>
                </div>
                <StatusPill status={executor.status} />
              </div>
              <div className="settings-grid">
                <label>
                  {executor.displayName} endpoint / base URL
                  <input defaultValue={executor.configuration.endpoint} name="endpoint" />
                </label>
                <label>
                  {executor.displayName} model / voice
                  <input defaultValue={executor.configuration.model} name="model" />
                </label>
                <label>
                  {executor.displayName} secret reference
                  <input defaultValue={(executor.configuration.secretRef || executor.requiredSecret) ?? ""} name="secretRef" />
                </label>
                <label>
                  {executor.displayName} notes
                  <input defaultValue={executor.configuration.notes} name="notes" />
                </label>
              </div>
              <button type="submit">Save {executor.displayName} configuration</button>
            </form>
          ))}
        </div>
      </Panel>

      <Panel
        description="ASR/TTS provider slots are explicit and unconfigured by default."
        icon={<Mic aria-hidden="true" size={19} />}
        title="Voice Providers"
      >
        <VoiceSettingsPanel actions={actions} voiceExecutors={voiceExecutors} voiceRequests={voiceRequests} />
      </Panel>
    </div>
  );
}
