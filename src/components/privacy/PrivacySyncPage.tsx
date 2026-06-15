import { Check, Eye, Shield, X } from "lucide-react";
import type { AppActions, ObservationFormState } from "../../app/actions";
import type { ObservationSession, SyncProfile } from "../../domain/types";
import { Panel } from "../ui/Panel";
import { StatusPill } from "../ui/StatusPill";

export function PrivacySyncPage({
  observationSessions,
  activeObservation,
  syncProfile,
  observationForm,
  setObservationForm,
  actions
}: {
  observationSessions: ObservationSession[];
  activeObservation: ObservationSession | undefined;
  syncProfile: SyncProfile;
  observationForm: ObservationFormState;
  setObservationForm: (next: ObservationFormState) => void;
  actions: AppActions;
}) {
  return (
    <div className="page-grid privacy-page">
      <Panel
        className="primary-page-panel"
        description="Manual sessions, app allowlists, and local summaries only."
        icon={<Eye aria-hidden="true" size={19} />}
        title="Observation"
      >
        <label>
          Allowed apps
          <input
            value={observationForm.allowedApps}
            onChange={(event) => setObservationForm({ ...observationForm, allowedApps: event.target.value })}
          />
        </label>
        <div className="button-row">
          <button onClick={actions.startObservation} type="button">
            <Eye aria-hidden="true" size={15} />
            Start observation
          </button>
          <button disabled={!activeObservation} onClick={actions.stopObservation} type="button">
            <X aria-hidden="true" size={15} />
            Stop
          </button>
        </div>
        <label>
          Local summary
          <input
            disabled={!activeObservation}
            value={observationForm.summary}
            onChange={(event) => setObservationForm({ ...observationForm, summary: event.target.value })}
            placeholder="User reviewed a design document"
          />
        </label>
        <button disabled={!activeObservation} onClick={actions.addObservationSummary} type="button">
          <Check aria-hidden="true" size={15} />
          Add local summary
        </button>
        <div className="summary-list">
          {observationSessions.flatMap((session) =>
            session.localSummaryStream.map((summary) => (
              <p key={summary.id}>
                <strong>{summary.appName}</strong>: {summary.summary}
              </p>
            ))
          )}
        </div>
      </Panel>

      <Panel
        description="Sync is optional and limited to confirmed summaries and non-sensitive settings."
        icon={<Shield aria-hidden="true" size={19} />}
        title="Privacy and Sync"
      >
        <label className="toggle-row">
          <input
            checked={syncProfile.enabled}
            onChange={(event) => actions.setSyncEnabled(event.target.checked)}
            type="checkbox"
          />
          Enable optional sync for confirmed summaries
        </label>
        <div className="privacy-status-list">
          <StatusPill status={syncProfile.enabled ? "active" : "inactive"}>
            Sync {syncProfile.enabled ? "enabled" : "off"}
          </StatusPill>
          <StatusPill>{syncProfile.lastSyncStatus}</StatusPill>
        </div>
        <p className="local-only">Local-only: {syncProfile.localOnlyClasses.join(", ")}</p>
        <p className="local-only">Sync-allowed: {syncProfile.allowedDataClasses.join(", ")}</p>
      </Panel>
    </div>
  );
}
