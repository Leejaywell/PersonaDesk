import { Mic, Volume2 } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import type { AppActions } from "../../app/actions";
import type { Character, Executor, VoiceRequest, VoiceRequestKind, VoiceRouteTarget } from "../../domain/types";
import { StatusPill } from "../ui/StatusPill";

function requestKindLabel(kind: VoiceRequestKind): string {
  return kind === "asr-transcript" ? "ASR transcript request" : "TTS preview request";
}

function matchingType(kind: VoiceRequestKind): Executor["type"] {
  return kind === "asr-transcript" ? "asr" : "tts";
}

function preferredExecutorId(executors: Executor[]): string {
  return executors.find((executor) => executor.status === "available")?.id ?? executors[0]?.id ?? "";
}

export function VoiceSettingsPanel({
  actions,
  emotionalCharacters,
  voiceExecutors,
  voiceRequests
}: {
  actions: AppActions;
  emotionalCharacters: Character[];
  voiceExecutors: Executor[];
  voiceRequests: VoiceRequest[];
}) {
  const [kind, setKind] = useState<VoiceRequestKind>("asr-transcript");
  const [executorId, setExecutorId] = useState(
    preferredExecutorId(voiceExecutors.filter((executor) => executor.type === "asr"))
  );
  const [routeTarget, setRouteTarget] = useState<VoiceRouteTarget>("audit-only");
  const [characterId, setCharacterId] = useState(emotionalCharacters[0]?.id ?? "");
  const [text, setText] = useState("");
  const [captureDisclosure, setCaptureDisclosure] = useState("Runtime speech capture has not been requested.");
  const [runtimeCaptureDisclosure, setRuntimeCaptureDisclosure] = useState("");
  const matchingExecutors = useMemo(
    () => voiceExecutors.filter((executor) => executor.type === matchingType(kind)),
    [kind, voiceExecutors]
  );
  const selectedExecutorId = matchingExecutors.some((executor) => executor.id === executorId)
    ? executorId
    : preferredExecutorId(matchingExecutors);
  const canCaptureRuntimeSpeech = kind === "asr-transcript" && selectedExecutorId === "browser-asr";
  const recentRequests = voiceRequests.slice(-5).reverse();

  function updateKind(nextKind: VoiceRequestKind) {
    const nextExecutors = voiceExecutors.filter((executor) => executor.type === matchingType(nextKind));

    setKind(nextKind);
    setExecutorId(preferredExecutorId(nextExecutors));
    setRouteTarget("audit-only");
    setCaptureDisclosure("Runtime speech capture has not been requested.");
    setRuntimeCaptureDisclosure("");
  }

  async function captureRuntimeTranscript() {
    setCaptureDisclosure("Listening for runtime speech recognition...");
    const result = await actions.captureSpeechTranscript();

    setCaptureDisclosure(result.disclosure);

    if (result.status === "captured") {
      setText(result.transcript);
      setRuntimeCaptureDisclosure(result.disclosure);
    }
  }

  function submitVoiceRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedExecutorId || !text.trim()) {
      return;
    }

    actions.createVoiceRequest({
      kind,
      executorId: selectedExecutorId,
      characterId: routeTarget === "companion" ? characterId : null,
      routeTarget,
      inputSource: runtimeCaptureDisclosure && text.trim() ? "runtime-speech-recognition" : "manual-text",
      captureDisclosure: runtimeCaptureDisclosure && text.trim() ? runtimeCaptureDisclosure : undefined,
      text
    });
    setText("");
    setRuntimeCaptureDisclosure("");
  }

  return (
    <div className="voice-settings">
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

      <form className="voice-request-form" onSubmit={submitVoiceRequest}>
        <div className="settings-grid">
          <label>
            Voice request kind
            <select value={kind} onChange={(event) => updateKind(event.target.value as VoiceRequestKind)}>
              <option value="asr-transcript">ASR transcript request</option>
              <option value="tts-preview">TTS preview request</option>
            </select>
          </label>
          <label>
            Voice provider
            <select value={selectedExecutorId} onChange={(event) => setExecutorId(event.target.value)}>
              {matchingExecutors.map((executor) => (
                <option key={executor.id} value={executor.id}>
                  {executor.displayName}
                </option>
              ))}
            </select>
          </label>
          {kind === "asr-transcript" ? (
            <>
              <label>
                ASR transcript route
                <select
                  value={routeTarget}
                  onChange={(event) => setRouteTarget(event.target.value as VoiceRouteTarget)}
                >
                  <option value="audit-only">Audit only</option>
                  <option value="companion">Companion chat</option>
                  <option value="task-goal">Task goal draft</option>
                </select>
              </label>
              {routeTarget === "companion" ? (
                <label>
                  Transcript companion
                  <select value={characterId} onChange={(event) => setCharacterId(event.target.value)}>
                    {emotionalCharacters.map((character) => (
                      <option key={character.id} value={character.id}>
                        {character.name}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
            </>
          ) : null}
          <label className="wide-field">
            Voice request text
            <textarea
              onChange={(event) => setText(event.target.value)}
              placeholder="Type transcript text or speech preview text"
              value={text}
            />
          </label>
        </div>
        {kind === "asr-transcript" ? (
          <div className="voice-playback-row">
            <button disabled={!canCaptureRuntimeSpeech} onClick={() => void captureRuntimeTranscript()} type="button">
              <Mic aria-hidden="true" size={15} />
              Capture runtime speech transcript
            </button>
            <p>{captureDisclosure}</p>
          </div>
        ) : null}
        <button disabled={!selectedExecutorId || !text.trim()} type="submit">
          {kind === "asr-transcript" ? <Mic aria-hidden="true" size={15} /> : <Volume2 aria-hidden="true" size={15} />}
          Record voice request
        </button>
      </form>

      <div className="voice-request-list">
        <h3>Recent voice request audit</h3>
        {recentRequests.length === 0 ? <p className="empty-state">No voice requests recorded yet.</p> : null}
        {recentRequests.map((request) => (
          <article className="voice-request-card" key={request.id}>
            <div className="task-card-header">
              <div>
                <strong>{requestKindLabel(request.kind)}</strong>
                <p>{request.text}</p>
                <small>Route: {request.routeTarget}</small>
                {request.kind === "asr-transcript" ? <small>Source: {request.inputSource}</small> : null}
              </div>
              <StatusPill status={request.status} />
            </div>
            {request.kind === "asr-transcript" ? <p>{request.captureDisclosure}</p> : null}
            <p>{request.disclosure}</p>
            {request.kind === "tts-preview" ? (
              <div className="voice-playback-row">
                <button onClick={() => void actions.playVoicePreview(request.id)} type="button">
                  <Volume2 aria-hidden="true" size={15} />
                  Play local speech preview
                </button>
                <StatusPill status={request.playbackStatus} />
                <p>{request.playbackDisclosure}</p>
              </div>
            ) : null}
          </article>
        ))}
      </div>
    </div>
  );
}
