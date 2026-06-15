# PersonaDesk

PersonaDesk is a local-first, cross-platform desktop companion platform for multiple emotional characters and task characters.

This repository currently implements the Phase 1 thin slice from the design spec. It is intentionally honest about unavailable integrations: unconfigured cloud models, ASR/TTS providers, and missing local agents are shown as unavailable instead of returning fake success.

## What Works Now

- Tauri + Vite + React project scaffold.
- Domain model for emotional characters, task characters, role boundaries, executors, tasks, memories, observation sessions, and sync settings.
- Multiple default characters:
  - Emotional characters stay in the desktop presence layer and cannot call executors by default.
  - Task characters can use permitted executors.
- Character draft generation from text and optional image file metadata:
  - drafts remain inactive until confirmed,
  - image handling is disclosed as metadata-only when no vision provider is configured.
- Character Studio settings for activated characters:
  - relationship template and custom relationship,
  - role boundary selection constrained by emotional/task role type,
  - proactive frequency, triggers, and do-not-disturb,
  - memory permission scopes,
  - appearance backend, avatar label, accent color, and voice profile fields.
- Desktop companion chat:
  - emotional characters can exchange local deterministic messages with the user,
  - emotional characters with task-comment permission can leave local reactions after task delivery or approval blocks,
  - task characters cannot act as desktop companions,
  - no model provider is called by this Phase 1 chat,
  - raw companion conversations remain local-only and are excluded from sync preview.
- A real deterministic local planner executor for text planning and validation.
- Autonomous task loop:
  - creates a task,
  - lets the user choose supervised or unsupervised mode,
  - lets the user choose the current authorization scope,
  - lets the user choose which task executors are allowed for that run,
  - assigns task characters,
  - generates a deterministic artifact,
  - validates the artifact,
  - delivers a task card,
  - asks the user to accept the delivered result or request revision,
  - records the final user acceptance decision on the task run,
  - creates a new revised delivery run from user revision feedback,
  - blocks when the request exceeds the authorization scope,
  - blocks when the allowed executor list has no available executor instead of silently falling back,
  - lets the user grant requested scopes and resume the same blocked task while preserving the blocked run as history.
- Memory candidate workflow:
  - candidates are proposed,
  - users can edit memory text, layer, owner, sensitivity, and sync policy before confirmation,
  - owner choices are constrained by each character's memory permission scope,
  - context preview shows which confirmed memories would be injected for a selected character and task,
  - high-sensitivity memories are excluded from context preview unless explicitly included,
  - long-term memory is written only after confirmation,
  - high-sensitivity memories are forced to local-only,
  - rejected candidates are discarded.
- Observation session workflow:
  - sessions are manually started,
  - app allowlists are enforced,
  - non-allowlisted observation events are ignored and recorded in a boundary audit,
  - only local text summaries are stored,
  - cloud vision review requires an explicit approval audit record,
  - approval records do not upload raw screen frames in this Phase 1 implementation,
  - raw screen frames are not stored by this implementation.
- Versioned localStorage persistence.
- LocalStorage migration that preserves user state while adding newly introduced default characters, role boundaries, executor slots, and sync data classes.
- Local sync preview for optional sync:
  - lists sync-eligible character definitions, memory summaries, and non-sensitive settings,
  - lists excluded local-only data such as raw observation streams and detailed task logs,
  - does not upload data in Phase 1.
- Product navigation for Phase 1 areas:
  - Desktop: emotional presence and light task status.
  - Tasks: task intake, task characters, task cards, validation, artifacts, and approval gates.
  - Characters: emotional characters, task characters, and inactive character drafts.
  - Memory: pending memory candidates and confirmed memory counts.
  - Executors: model API, local model, local agent, deterministic, ASR, TTS, and vision provider status.
  - Privacy: observation allowlists, local summaries, and optional sync boundaries.
- Manual local agent scan from the Executors section, backed by a Rust/Tauri safe detection command.
- Provider configuration metadata for model API, local model, ASR, TTS, and vision slots:
  - stores endpoint/model/secret-reference notes,
  - does not store raw secrets,
  - marks providers as configured but not verified or callable,
  - records local executor health-check audits without contacting external providers.
- Voice request audit for ASR/TTS slots:
  - records transcript and speech-preview requests locally,
  - reports skipped/configured-not-verified status from the selected provider,
  - does not capture microphone audio, generate audio, play audio, or upload raw audio in this Phase 1 implementation.

## What Is Not Pretended

- Cloud model APIs are not treated as available until configured.
- Local model servers are not treated as available until configured.
- Codex/Claude/Cursor/Gemini local agents are not treated as available unless safe detection finds them.
- Tasks only run through executors allowed for that task; unavailable allowed executors create a visible blocked run.
- ASR and TTS are exposed as provider slots and local request audit records, but no microphone capture, transcription adapter, audio generation, or playback adapter is implemented yet.
- Screen observation stores local summaries only. It does not capture or upload raw frames.
- Cloud vision approvals are recorded as audit entries only until a real vision provider and upload path are configured.
- Optional sync is represented by local settings and a local preview. A cloud sync backend is not implemented yet.

## Privacy Defaults

- Local data is authoritative by default.
- Raw imports, raw audio, raw screen frames, local agent logs, and sensitive memory remain local-only by default.
- Long-term memory requires confirmation.
- Tasks pause when they request destructive file access, publishing, payment, sensitive data, or other scope expansion.
- Missing providers are visible in the Executor Registry with their reason.

## Development

Install dependencies:

```bash
npm install
```

Run the web UI:

```bash
npm run dev
```

Run frontend/domain tests:

```bash
npm test
```

Build the frontend:

```bash
npm run build
```

Run Rust/Tauri tests:

```bash
cargo test --manifest-path src-tauri/Cargo.toml
```

Run the Tauri app in development:

```bash
npm run tauri dev
```

## Key Documents

- Design spec: `docs/superpowers/specs/2026-06-15-personadesk-platform-design.md`
- Implementation plan: `docs/superpowers/plans/2026-06-15-personadesk-phase-1.md`
- Product navigation plan: `docs/superpowers/plans/2026-06-15-personadesk-product-navigation.md`

## UX Notes

The first Phase 1 UI exposed every capability on one engineering validation page. The current interface keeps the desktop stage focused on emotional presence and moves management workflows into separate console sections. This keeps companion behavior visible without mixing it with executor, privacy, memory, and task administration controls.

## Repository

Remote: https://github.com/Leejaywell/PersonaDesk
