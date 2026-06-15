import { Sparkles } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import type { AppActions } from "../../app/actions";
import type { Character, ConversationMessage, RoleBoundary, TaskRun } from "../../domain/types";
import { CharacterCard } from "../characters/CharacterCard";
import { Panel } from "../ui/Panel";
import { StatusPill } from "../ui/StatusPill";

export function DesktopStagePage({
  emotionalCharacters,
  roleBoundaries,
  latestRun,
  conversationMessages,
  actions
}: {
  emotionalCharacters: Character[];
  roleBoundaries: Record<string, RoleBoundary>;
  latestRun: TaskRun | undefined;
  conversationMessages: ConversationMessage[];
  actions: AppActions;
}) {
  const [selectedCharacterId, setSelectedCharacterId] = useState(emotionalCharacters[0]?.id ?? "");
  const [messageText, setMessageText] = useState("");
  const [taskStageExpanded, setTaskStageExpanded] = useState(Boolean(latestRun));
  const selectedCharacter = emotionalCharacters.find((character) => character.id === selectedCharacterId) ?? emotionalCharacters[0];
  const visibleMessages = conversationMessages.filter((message) => message.characterId === selectedCharacter?.id).slice(-8);
  const passedValidations = latestRun?.validationResults.filter((result) => result.passed).length ?? 0;

  useEffect(() => {
    if (latestRun) {
      setTaskStageExpanded(true);
    }
  }, [latestRun?.id]);

  function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedCharacter || !messageText.trim()) {
      return;
    }

    actions.sendCompanionMessage(selectedCharacter.id, messageText);
    setMessageText("");
  }

  return (
    <div className="page-grid desktop-page">
      <Panel
        className="desktop-stage-panel"
        description="Emotional characters stay visible here; management controls live in the console sections."
        icon={<Sparkles aria-hidden="true" size={19} />}
        title="Desktop Stage"
      >
        <div className="stage-surface">
          {emotionalCharacters.map((character, index) => (
            <div
              className={`avatar-card ${index % 2 === 0 ? "warm" : "cool"}`}
              key={character.id}
              style={{ backgroundColor: character.appearance.accent }}
            >
              {character.appearance.avatarLabel}
            </div>
          ))}
          <div className="stage-caption">
            Emotional characters can accompany the user, watch approved observation sessions, and comment within
            configured boundaries.
          </div>
        </div>
        <div className={`desktop-task-stage ${taskStageExpanded ? "expanded" : "collapsed"}`}>
          <div className="task-card-header">
            <div>
              <strong>Task Stage</strong>
              <p>{latestRun ? latestRun.finalSummary : "No task is staged yet."}</p>
            </div>
            <div className="button-row">
              {latestRun ? <StatusPill status={latestRun.status} /> : <StatusPill>Idle</StatusPill>}
              <button
                disabled={!latestRun}
                onClick={() => setTaskStageExpanded((expanded) => !expanded)}
                type="button"
              >
                {taskStageExpanded ? "Collapse task stage" : "Expand task stage"}
              </button>
            </div>
          </div>
          {latestRun && taskStageExpanded ? (
            <div className="desktop-task-stage-details">
              <span className="meta-chip">Mode: expanded</span>
              <span className="meta-chip">Assigned: {latestRun.assignedCharacters.join(", ")}</span>
              <span className="meta-chip">
                Validation: {passedValidations}/{latestRun.validationResults.length}
              </span>
              <p>{latestRun.decisions[0]}</p>
            </div>
          ) : (
            <div className="desktop-task-stage-details">
              <span className="meta-chip">Mode: collapsed</span>
              <p>{latestRun ? "Latest task is available in the task room." : "Task stage is waiting for work."}</p>
            </div>
          )}
        </div>
      </Panel>

      <Panel
        description="Presence roles are separate from task execution roles."
        title="Emotional Presence"
      >
        <div className="card-list">
          {emotionalCharacters.map((character) => (
            <CharacterCard
              boundaryLabel={roleBoundaries[character.roleBoundaryId].label}
              character={character}
              key={character.id}
            />
          ))}
        </div>
        <div className="desktop-latest-task">
          <strong>Latest task</strong>
          {latestRun ? <StatusPill status={latestRun.status} /> : <span className="empty-state">No task run yet.</span>}
        </div>
      </Panel>

      <Panel
        className="wide-panel"
        description="Local deterministic chat for emotional characters; no model provider is called."
        title="Companion Chat"
      >
        <form className="companion-chat-form" onSubmit={sendMessage}>
          <div className="settings-grid">
            <label>
              Companion
              <select value={selectedCharacter?.id ?? ""} onChange={(event) => setSelectedCharacterId(event.target.value)}>
                {emotionalCharacters.map((character) => (
                  <option key={character.id} value={character.id}>
                    {character.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Message
              <input
                value={messageText}
                onChange={(event) => setMessageText(event.target.value)}
                placeholder="Stay with me while I work through this."
              />
            </label>
          </div>
          <button type="submit">Send local companion message</button>
        </form>
        <div className="conversation-list" aria-label="Companion conversation">
          {visibleMessages.length === 0 ? (
            <p className="empty-state">No companion messages yet.</p>
          ) : (
            visibleMessages.map((message) => (
              <article className={`conversation-message ${message.speaker}`} key={message.id}>
                <strong>{message.speaker === "user" ? "You" : selectedCharacter?.name ?? "Companion"}</strong>
                <p>{message.text}</p>
              </article>
            ))
          )}
        </div>
      </Panel>
    </div>
  );
}
