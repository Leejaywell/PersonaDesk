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
- A real deterministic local planner executor for text planning and validation.
- Autonomous task loop:
  - creates a task,
  - assigns task characters,
  - generates a deterministic artifact,
  - validates the artifact,
  - delivers a task card,
  - blocks when the request exceeds the authorization scope.
- Memory candidate workflow:
  - candidates are proposed,
  - long-term memory is written only after confirmation,
  - rejected candidates are discarded.
- Observation session workflow:
  - sessions are manually started,
  - app allowlists are enforced,
  - only local text summaries are stored,
  - raw screen frames are not stored by this implementation.
- Versioned localStorage persistence.
- Product navigation for Phase 1 areas:
  - Desktop: emotional presence and light task status.
  - Tasks: task intake, task characters, task cards, validation, artifacts, and approval gates.
  - Characters: emotional characters, task characters, and inactive character drafts.
  - Memory: pending memory candidates and confirmed memory counts.
  - Executors: model API, local model, local agent, deterministic, ASR, TTS, and vision provider status.
  - Privacy: observation allowlists, local summaries, and optional sync boundaries.
- Manual local agent scan from the Executors section, backed by a Rust/Tauri safe detection command.

## What Is Not Pretended

- Cloud model APIs are not treated as available until configured.
- Local model servers are not treated as available until configured.
- Codex/Claude/Cursor/Gemini local agents are not treated as available unless safe detection finds them.
- ASR and TTS are exposed as provider slots, but no provider is selected by default.
- Screen observation stores local summaries only. It does not capture or upload raw frames.
- Optional sync is represented by local settings. A cloud sync backend is not implemented yet.

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
