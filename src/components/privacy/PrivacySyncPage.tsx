import { AlertTriangle, Check, Eye, Shield, X } from "lucide-react";
import type { AppActions, ObservationFormState } from "../../app/actions";
import type { SyncPackageImportPreview, SyncPreview } from "../../domain/sync";
import type { ObservationSession, SyncProfile } from "../../domain/types";
import { Panel } from "../ui/Panel";
import { StatusPill } from "../ui/StatusPill";

export function PrivacySyncPage({
  observationSessions,
  activeObservation,
  syncProfile,
  syncPreview,
  syncPackageText,
  syncImportPreview,
  observationForm,
  setObservationForm,
  setSyncPackageText,
  actions
}: {
  observationSessions: ObservationSession[];
  activeObservation: ObservationSession | undefined;
  syncProfile: SyncProfile;
  syncPreview: SyncPreview | null;
  syncPackageText: string;
  syncImportPreview: SyncPackageImportPreview | null;
  observationForm: ObservationFormState;
  setObservationForm: (next: ObservationFormState) => void;
  setSyncPackageText: (next: string) => void;
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
        <label>
          Event source app
          <input
            disabled={!activeObservation}
            value={observationForm.sourceApp}
            onChange={(event) => setObservationForm({ ...observationForm, sourceApp: event.target.value })}
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
        <label>
          Cloud vision approval reason
          <input
            value={observationForm.cloudVisionReason}
            onChange={(event) =>
              setObservationForm({ ...observationForm, cloudVisionReason: event.target.value })
            }
          />
        </label>
        <div className="summary-list">
          {observationSessions.flatMap((session) =>
            session.localSummaryStream.map((summary) => {
              const approved = session.cloudUploadApprovals.some((approval) => approval.summaryId === summary.id);

              return (
                <article className="summary-card" key={summary.id}>
                  <p>
                    <strong>{summary.appName}</strong>: {summary.summary}
                  </p>
                  <button
                    disabled={approved}
                    onClick={() => actions.approveCloudVisionUpload(session.id, summary.id)}
                    type="button"
                  >
                    <Shield aria-hidden="true" size={15} />
                    {approved ? "Cloud vision approved" : "Approve cloud vision review"}
                  </button>
                </article>
              );
            })
          )}
        </div>
        <div className="approval-list" aria-label="Observation boundary audit">
          {observationSessions.flatMap((session) =>
            session.boundaryViolations.map((violation) => (
              <article className="review-card" key={violation.id}>
                <div className="task-card-header">
                  <div>
                    <h3>{violation.appName}</h3>
                    <p>{violation.reason}</p>
                  </div>
                  <AlertTriangle aria-hidden="true" size={18} />
                </div>
                <p>Discarded summary characters: {violation.discardedSummaryCharacters}</p>
              </article>
            ))
          )}
        </div>
        <div className="approval-list" aria-label="Cloud vision approval audit">
          {observationSessions.flatMap((session) =>
            session.cloudUploadApprovals.map((approval) => (
              <article className="review-card" key={approval.id}>
                <div className="task-card-header">
                  <div>
                    <h3>{approval.appName}</h3>
                    <p>{approval.reason}</p>
                  </div>
                  <StatusPill status={approval.providerStatus} />
                </div>
                <p>{approval.disclosure}</p>
              </article>
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
        <button onClick={actions.prepareSyncPreview} type="button">
          <Shield aria-hidden="true" size={15} />
          Generate sync preview
        </button>
        <div className="button-row">
          <button disabled={!syncProfile.enabled} onClick={actions.exportLocalSyncPackage} type="button">
            Export local sync package
          </button>
          <button disabled={!syncPackageText.trim()} onClick={actions.previewSyncPackageImport} type="button">
            Preview sync package import
          </button>
        </div>
        <label>
          Local sync package JSON
          <textarea
            className="sync-package-textarea"
            onChange={(event) => setSyncPackageText(event.target.value)}
            placeholder="Export a local sync package or paste one here for preflight."
            value={syncPackageText}
          />
        </label>
        <p className="local-only">Local-only: {syncProfile.localOnlyClasses.join(", ")}</p>
        <p className="local-only">Sync-allowed: {syncProfile.allowedDataClasses.join(", ")}</p>
        {syncImportPreview && (
          <div className="sync-import-preview" aria-label="Sync package import preflight">
            <div className="task-card-header">
              <strong>Import preflight {syncImportPreview.status}</strong>
              <StatusPill status={syncImportPreview.status === "ready" ? "ready" : "blocked"} />
            </div>
            <p>{syncImportPreview.disclosure}</p>
            <div className="settings-grid">
              <section className="sync-preview-list" aria-label="Sync import accepted">
                <h3>Accepted</h3>
                {syncImportPreview.accepted.length === 0 ? (
                  <p className="empty-state">No new package items ready for import.</p>
                ) : (
                  syncImportPreview.accepted.map((item) => (
                    <article className="review-card" key={item.id}>
                      <strong>{item.label}</strong>
                      <p>{item.dataClass}</p>
                      <p>{item.reason}</p>
                    </article>
                  ))
                )}
              </section>
              <section className="sync-preview-list" aria-label="Sync import conflicts">
                <h3>Conflicts</h3>
                {syncImportPreview.conflicts.length === 0 ? (
                  <p className="empty-state">No conflicts found.</p>
                ) : (
                  syncImportPreview.conflicts.map((item) => (
                    <article className="review-card" key={item.id}>
                      <strong>{item.label}</strong>
                      <p>{item.dataClass}</p>
                      <p>{item.reason}</p>
                    </article>
                  ))
                )}
              </section>
              <section className="sync-preview-list" aria-label="Sync import rejected">
                <h3>Rejected</h3>
                {syncImportPreview.rejected.length === 0 ? (
                  <p className="empty-state">No rejected package items.</p>
                ) : (
                  syncImportPreview.rejected.map((item) => (
                    <article className="review-card" key={item.id}>
                      <strong>{item.label}</strong>
                      <p>{item.dataClass}</p>
                      <p>{item.reason}</p>
                    </article>
                  ))
                )}
              </section>
            </div>
          </div>
        )}
        {syncPreview && (
          <div className="sync-preview" aria-label="Local sync preview">
            <p>{syncPreview.disclosure}</p>
            <div className="settings-grid">
              <section className="sync-preview-list" aria-label="Sync preview included">
                <h3>Included</h3>
                {syncPreview.included.length === 0 ? (
                  <p className="empty-state">No upload items prepared.</p>
                ) : (
                  syncPreview.included.map((item) => (
                    <article className="review-card" key={item.id}>
                      <strong>{item.label}</strong>
                      <p>{item.dataClass}</p>
                      <p>{item.detail}</p>
                    </article>
                  ))
                )}
              </section>
              <section className="sync-preview-list" aria-label="Sync preview excluded">
                <h3>Excluded</h3>
                {syncPreview.excluded.map((item) => (
                  <article className="review-card" key={item.id}>
                    <strong>{item.label}</strong>
                    <p>{item.dataClass}</p>
                    <p>{item.reason}</p>
                  </article>
                ))}
              </section>
            </div>
          </div>
        )}
      </Panel>
    </div>
  );
}
