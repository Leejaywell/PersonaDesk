import { Sparkles } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import type { AppActions } from "../../app/actions";
import type { CompanionWindowControlState } from "../../app/companionWindowControl";
import type { DesktopPresencePlan } from "../../app/desktopPresence";
import type { DesktopWindowPlanResult } from "../../app/desktopWindows";
import type { StartupBehaviorState } from "../../app/startupBehavior";
import type { Character, ConversationMessage, DesktopPresenceAudit, RoleBoundary, TaskRun } from "../../domain/types";
import { CharacterCard } from "../characters/CharacterCard";
import { Panel } from "../ui/Panel";
import { StatusPill } from "../ui/StatusPill";

export function DesktopStagePage({
  emotionalCharacters,
  roleBoundaries,
  latestRun,
  companionWindowControl,
  conversationMessages,
  desktopPresenceAudits,
  desktopPresencePlan,
  desktopWindowPlan,
  startupBehavior,
  actions
}: {
  emotionalCharacters: Character[];
  roleBoundaries: Record<string, RoleBoundary>;
  latestRun: TaskRun | undefined;
  companionWindowControl: CompanionWindowControlState;
  conversationMessages: ConversationMessage[];
  desktopPresenceAudits: DesktopPresenceAudit[];
  desktopPresencePlan: DesktopPresencePlan;
  desktopWindowPlan: DesktopWindowPlanResult;
  startupBehavior: StartupBehaviorState;
  actions: AppActions;
}) {
  const [selectedCharacterId, setSelectedCharacterId] = useState(emotionalCharacters[0]?.id ?? "");
  const [messageText, setMessageText] = useState("");
  const [taskStageExpanded, setTaskStageExpanded] = useState(Boolean(latestRun));
  const selectedCharacter = emotionalCharacters.find((character) => character.id === selectedCharacterId) ?? emotionalCharacters[0];
  const visibleMessages = conversationMessages.filter((message) => message.characterId === selectedCharacter?.id).slice(-8);
  const recentDesktopPresenceAudits = desktopPresenceAudits.slice(-4).reverse();
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
        description="The desktop runtime starts the management console separately from the always-on-top companion surface."
        title="Native Surfaces"
      >
        <p className="local-only">{desktopWindowPlan.message}</p>
        <div className="native-window-list">
          {desktopWindowPlan.windows.map((windowPlan) => (
            <article className="summary-card" key={windowPlan.label}>
              <div className="task-card-header">
                <div>
                  <strong>{windowPlan.title}</strong>
                  <p>
                    {windowPlan.label} / {windowPlan.surface} / {windowPlan.width}x{windowPlan.height}
                  </p>
                </div>
                <StatusPill status={windowPlan.alwaysOnTop ? "active" : "inactive"}>
                  {windowPlan.alwaysOnTop ? "Always on top" : "Console"}
                </StatusPill>
              </div>
              <div className="task-meta-row">
                <span className="meta-chip">Decorations: {windowPlan.decorations ? "on" : "off"}</span>
                <span className="meta-chip">Transparent: {windowPlan.transparent ? "yes" : "no"}</span>
                <span className="meta-chip">Shadow: {windowPlan.shadow ? "on" : "off"}</span>
                <span className="meta-chip">Taskbar: {windowPlan.skipTaskbar ? "hidden" : "shown"}</span>
                <span className="meta-chip">Initial focus: {windowPlan.focus ? "yes" : "no"}</span>
                <span className="meta-chip">Initial visibility: {windowPlan.visible ? "shown" : "hidden"}</span>
                <span className="meta-chip">Drag region: {windowPlan.dragRegion ? "ready" : "none"}</span>
              </div>
            </article>
          ))}
          <article className="summary-card">
            <div className="task-card-header">
              <div>
                <strong>Companion Window Control</strong>
                <p>{companionWindowControl.disclosure}</p>
              </div>
              <button
                disabled={!companionWindowControl.available || companionWindowControl.status === "updating"}
                onClick={actions.toggleCompanionWindow}
                type="button"
              >
                {companionWindowControl.visible ? "Hide companion window" : "Show companion window"}
              </button>
            </div>
            <div className="task-meta-row">
              <StatusPill status={companionWindowControl.visible ? "active" : "inactive"}>
                {companionWindowControl.status}
              </StatusPill>
              <span className="meta-chip">
                Runtime: {companionWindowControl.available ? "desktop" : "browser preview"}
              </span>
            </div>
          </article>
        </div>
      </Panel>

      <Panel
        description="Tray, startup, and notification contracts stay local-first while native event wiring is added incrementally."
        title="Native Presence"
      >
        <p className="local-only">{desktopPresencePlan.message}</p>
        <div className="native-window-list">
          <article className="summary-card">
            <div className="task-card-header">
              <div>
                <strong>Tray Menu</strong>
                <p>{desktopPresencePlan.trayMenuItems.length} planned desktop actions</p>
              </div>
              <StatusPill status="active">Contract ready</StatusPill>
            </div>
            <div className="task-meta-row">
              {desktopPresencePlan.trayMenuItems.map((item) => (
                <span className="meta-chip" key={item.id}>
                  {item.label}
                </span>
              ))}
            </div>
          </article>
          <article className="summary-card">
            <div className="task-card-header">
              <div>
                <strong>Notifications</strong>
                <p>{desktopPresencePlan.notificationTriggers.length} local trigger contracts</p>
              </div>
              <button onClick={actions.previewDesktopNotification} type="button">
                Preview local desktop notification
              </button>
            </div>
            <div className="task-meta-row">
              {desktopPresencePlan.notificationTriggers.map((trigger) => (
                <span className="meta-chip" key={trigger.id}>
                  {trigger.label}
                </span>
              ))}
            </div>
          </article>
          <article className="summary-card">
            <div className="task-card-header">
              <div>
                <strong>Startup</strong>
                <p>{startupBehavior.disclosure}</p>
              </div>
              <button
                disabled={!startupBehavior.available || startupBehavior.status === "updating"}
                onClick={actions.toggleStartupBehavior}
                type="button"
              >
                {startupBehavior.enabled ? "Disable startup" : "Enable startup"}
              </button>
            </div>
            <div className="task-meta-row">
              <StatusPill status={startupBehavior.status === "enabled" ? "active" : "inactive"}>
                {startupBehavior.status}
              </StatusPill>
              <span className="meta-chip">Runtime: {startupBehavior.available ? "desktop" : "browser preview"}</span>
            </div>
          </article>
        </div>
        <div className="voice-request-list" aria-label="Desktop presence audit">
          {recentDesktopPresenceAudits.length === 0 ? (
            <p className="empty-state">No desktop presence audits yet.</p>
          ) : (
            recentDesktopPresenceAudits.map((audit) => (
              <article className="voice-request-card" key={audit.id}>
                <div className="task-card-header">
                  <div>
                    <strong>{audit.title}</strong>
                    <p>{audit.body}</p>
                  </div>
                  <StatusPill status={audit.status} />
                </div>
                <p>{audit.disclosure}</p>
              </article>
            ))
          )}
        </div>
        <p className="local-only">{desktopPresencePlan.disclosures.join(" ")}</p>
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
