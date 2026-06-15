export default function App() {
  return (
    <main className="app-shell">
      <section className="topbar" aria-label="PersonaDesk overview">
        <div>
          <h1>PersonaDesk</h1>
          <p>Multi-character desktop companion platform</p>
        </div>
        <span className="status-pill">Phase 1 thin slice</span>
      </section>

      <section className="workspace-grid">
        <section className="panel desktop-stage" aria-label="Desktop stage">
          <div className="panel-heading">
            <h2>Desktop Stage</h2>
            <span>Emotional presence</span>
          </div>
          <div className="stage-surface">
            <div className="avatar-card warm">Mira</div>
            <div className="avatar-card cool">Sol</div>
          </div>
        </section>

        <section className="panel task-stage" aria-label="Task room">
          <div className="panel-heading">
            <h2>Task Room</h2>
            <span>Task characters meet here</span>
          </div>
          <div className="task-row">
            <span>Orion</span>
            <span>Researcher</span>
          </div>
          <div className="task-row">
            <span>Vale</span>
            <span>Reviewer</span>
          </div>
        </section>

        <section className="panel control-console" aria-label="Control console">
          <div className="panel-heading">
            <h2>Control Console</h2>
            <span>Characters, tasks, memory, executors</span>
          </div>
          <p>
            Real stateful controls arrive in the next implementation tasks. Unconfigured
            providers will be shown honestly as unavailable.
          </p>
        </section>
      </section>
    </main>
  );
}
