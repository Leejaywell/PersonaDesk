# Implementation Plan: PersonaDesk Product Navigation

## Overview

The current PersonaDesk UI is a single engineering validation page that exposes every Phase 1 capability at once. The next step is to turn it into a product-shaped experience: a persistent desktop stage plus a control console with clear sections for tasks, characters, memory, executors, and privacy. This plan preserves the existing real domain runtime and moves behavior into smaller UI units without adding fake integrations.

## Architecture Decisions

- Keep the existing `PersonaDeskState` and domain modules as the source of truth. This phase is a UI architecture and information-architecture pass, not a domain rewrite.
- Split `src/App.tsx` into small components by product area, each receiving state and callbacks explicitly.
- Use local React state for section navigation first. Do not add React Router until deep links or multi-window routing are actually required.
- Keep existing tests green throughout. Add tests for section navigation, state preservation across sections, and the absence of management controls from the desktop stage.
- Keep unavailable model/voice/local-agent providers visible as unconfigured or missing. The navigation refactor must not turn unavailable integrations into fake successes.

## Dependency Graph

```
Navigation model and app actions
    |
    +-- Shared layout components
    |       |
    |       +-- Section pages
    |               |
    |               +-- Desktop stage
    |               +-- Task room
    |               +-- Character studio
    |               +-- Memory center
    |               +-- Executor settings
    |               +-- Privacy and sync
    |
    +-- App-level tests
            |
            +-- Manual render check
```

## Task List

### Phase 1: Navigation Foundation

## Task 1: Add Navigation Model and App Action Boundary

**Description:** Define the product sections and centralize app-level actions so `App.tsx` can delegate UI rendering without losing state behavior.

**Acceptance criteria:**
- [ ] Product sections are represented by typed IDs: `desktop`, `tasks`, `characters`, `memory`, `executors`, `privacy`.
- [ ] App-level callbacks exist for task running, draft generation, memory confirmation/rejection, observation session control, and sync toggle.
- [ ] No behavior is removed from the existing thin slice.

**Verification:**
- [ ] Tests pass: `npm test`
- [ ] Build succeeds: `npm run build`
- [ ] Manual check: starting the app still shows PersonaDesk and can run an autonomous task.

**Dependencies:** None

**Files likely touched:**
- `src/App.tsx`
- `src/app/navigation.ts`
- `src/app/actions.ts`

**Estimated scope:** Medium: 3 files

## Task 2: Create Shared Layout Components

**Description:** Introduce reusable layout components for the top bar, section navigation, panel frame, and status pills. This reduces repeated markup before moving panels into pages.

**Acceptance criteria:**
- [ ] Top-level app shell renders a persistent product header and section navigation.
- [ ] Panel chrome is centralized in a reusable component.
- [ ] Existing status colors and labels remain consistent.

**Verification:**
- [ ] Tests pass: `npm test`
- [ ] Build succeeds: `npm run build`
- [ ] Manual check: switching sections does not reset localStorage-backed app state.

**Dependencies:** Task 1

**Files likely touched:**
- `src/components/layout/AppShell.tsx`
- `src/components/layout/SectionNav.tsx`
- `src/components/ui/Panel.tsx`
- `src/components/ui/StatusPill.tsx`
- `src/styles.css`

**Estimated scope:** Medium: 5 files

### Checkpoint: Foundation

- [ ] `npm test` passes.
- [ ] `npm run build` passes.
- [ ] The UI has a visible navigation structure.
- [ ] Existing autonomous task and memory workflows still work.

### Phase 2: Product Sections

## Task 3: Build Focused Desktop Stage Section

**Description:** Make the desktop stage feel like the first product surface instead of a control dashboard. It should show emotional characters, their presence state, and lightweight task reminders only.

**Acceptance criteria:**
- [ ] Desktop stage shows emotional characters and latest task status.
- [ ] Desktop stage does not show executor registry, sync controls, or memory management controls.
- [ ] Emotional characters still display role boundary labels and relationship context.

**Verification:**
- [ ] Tests pass: `npm test -- src/App.test.tsx`
- [ ] Build succeeds: `npm run build`
- [ ] Manual check: desktop section reads as a companion surface, not a settings page.

**Dependencies:** Tasks 1-2

**Files likely touched:**
- `src/components/desktop/DesktopStagePage.tsx`
- `src/App.test.tsx`
- `src/styles.css`

**Estimated scope:** Small: 3 files

## Task 4: Build Task Room Section

**Description:** Move task intake, task cards, validation results, approval requests, and task-character context into a dedicated task room section.

**Acceptance criteria:**
- [ ] Task room contains the autonomous task form and task cards.
- [ ] Running a task from the task room still creates a delivered or blocked run using the real domain runtime.
- [ ] Task character cards are visible in this section, not mixed into global dashboard clutter.

**Verification:**
- [ ] Tests pass: `npm test -- src/App.test.tsx src/domain/tasks.test.ts`
- [ ] Build succeeds: `npm run build`
- [ ] Manual check: create a normal task and a risky task; normal delivers, risky blocks with approval request.

**Dependencies:** Tasks 1-2

**Files likely touched:**
- `src/components/tasks/TaskRoomPage.tsx`
- `src/components/tasks/TaskCard.tsx`
- `src/App.test.tsx`
- `src/styles.css`

**Estimated scope:** Medium: 4 files

## Task 5: Build Character Studio Section

**Description:** Move emotional/task character lists and character draft generation into a dedicated character studio. Draft generation must remain honest: text parsing is deterministic and image handling is metadata-only unless a vision executor is configured.

**Acceptance criteria:**
- [ ] Character Studio shows emotional characters, task characters, and pending drafts.
- [ ] Generating a draft does not activate it until confirmed.
- [ ] Image file handling disclosure is visible when no vision executor is configured.

**Verification:**
- [ ] Tests pass: `npm test -- src/domain/characterDrafts.test.ts src/App.test.tsx`
- [ ] Build succeeds: `npm run build`
- [ ] Manual check: generate a character draft with text and an image file, then confirm it; the character appears in the correct list.

**Dependencies:** Tasks 1-2

**Files likely touched:**
- `src/components/characters/CharacterStudioPage.tsx`
- `src/components/characters/CharacterCard.tsx`
- `src/components/characters/CharacterDraftForm.tsx`
- `src/App.test.tsx`
- `src/styles.css`

**Estimated scope:** Medium: 5 files

## Task 6: Build Memory Center Section

**Description:** Move memory candidates and confirmed memory counts into a dedicated memory center, and make the confirmation boundary visually explicit.

**Acceptance criteria:**
- [ ] Memory Center lists pending memory candidates.
- [ ] Confirming a candidate creates a long-term memory.
- [ ] Rejecting a candidate discards it without writing memory.

**Verification:**
- [ ] Tests pass: `npm test -- src/domain/memory.test.ts src/App.test.tsx`
- [ ] Build succeeds: `npm run build`
- [ ] Manual check: run a task, open Memory Center, confirm the generated memory candidate.

**Dependencies:** Tasks 1-2

**Files likely touched:**
- `src/components/memory/MemoryCenterPage.tsx`
- `src/App.test.tsx`
- `src/styles.css`

**Estimated scope:** Small: 3 files

### Checkpoint: Core Product Sections

- [ ] `npm test` passes.
- [ ] `npm run build` passes.
- [ ] Desktop, Tasks, Characters, and Memory sections each have a distinct job.
- [ ] Existing data persists while switching sections.

### Phase 3: Settings and Privacy Sections

## Task 7: Build Executor Settings Section

**Description:** Move executor registry and voice provider slots into a settings-style section that makes capability status and missing configuration obvious.

**Acceptance criteria:**
- [ ] Executor Settings lists deterministic, model API, local model, local agent, ASR, and TTS executors.
- [ ] Unconfigured and missing providers remain visible with status reasons.
- [ ] No unconfigured provider can be triggered as if it were available.

**Verification:**
- [ ] Tests pass: `npm test -- src/domain/executors.test.ts src/App.test.tsx`
- [ ] Build succeeds: `npm run build`
- [ ] Manual check: Executor Settings shows OpenAI-compatible API as unconfigured and Codex CLI as missing unless detected.

**Dependencies:** Tasks 1-2

**Files likely touched:**
- `src/components/settings/ExecutorSettingsPage.tsx`
- `src/components/settings/VoiceSettingsPanel.tsx`
- `src/App.test.tsx`
- `src/styles.css`

**Estimated scope:** Medium: 4 files

## Task 8: Build Privacy and Sync Section

**Description:** Move observation allowlists, local summaries, privacy defaults, and sync toggle into a dedicated privacy section.

**Acceptance criteria:**
- [ ] Privacy section can start and stop an observation session.
- [ ] Observation summaries are stored only for allowlisted apps.
- [ ] Sync toggle remains local and clearly says it is optional summaries only.
- [ ] Local-only data classes are visible.

**Verification:**
- [ ] Tests pass: `npm test -- src/domain/observation.test.ts src/domain/storage.test.ts src/App.test.tsx`
- [ ] Build succeeds: `npm run build`
- [ ] Manual check: start observation with Safari allowlisted, add a summary, stop the session, and confirm the summary remains local text only.

**Dependencies:** Tasks 1-2

**Files likely touched:**
- `src/components/privacy/PrivacySyncPage.tsx`
- `src/App.test.tsx`
- `src/styles.css`

**Estimated scope:** Small: 3 files

### Checkpoint: Settings and Privacy

- [ ] `npm test` passes.
- [ ] `npm run build` passes.
- [ ] `npm audit --audit-level=moderate` reports 0 vulnerabilities.
- [ ] Executor and privacy sections do not imply unavailable integrations are working.

### Phase 4: Cleanup and Documentation

## Task 9: Reduce App.tsx to Composition Only

**Description:** After pages are extracted, simplify `App.tsx` so it only owns state, actions, current section selection, persistence, and page composition.

**Acceptance criteria:**
- [ ] `App.tsx` no longer contains large panel markup.
- [ ] UI behavior stays covered by existing tests.
- [ ] No duplicated state mutation logic exists across pages.

**Verification:**
- [ ] Tests pass: `npm test`
- [ ] Build succeeds: `npm run build`
- [ ] Manual check: all sections remain reachable and functional.

**Dependencies:** Tasks 3-8

**Files likely touched:**
- `src/App.tsx`
- `src/app/actions.ts`
- `src/components/**`

**Estimated scope:** Medium: 3-5 files, mostly cleanup

## Task 10: Update README and Add UX Notes

**Description:** Update documentation to explain the new product structure and clarify that the previous all-in-one layout was an engineering validation stage.

**Acceptance criteria:**
- [ ] README lists the new product sections.
- [ ] README still states what is real now and what is unconfigured.
- [ ] A short UX note documents why management features live in the control console rather than the desktop stage.

**Verification:**
- [ ] Tests pass: `npm test`
- [ ] Build succeeds: `npm run build`
- [ ] Documentation review: README matches the UI sections.

**Dependencies:** Tasks 3-9

**Files likely touched:**
- `README.md`
- `docs/superpowers/plans/2026-06-15-personadesk-product-navigation.md`

**Estimated scope:** Small: 2 files

### Checkpoint: Complete

- [ ] All tests pass: `npm test`.
- [ ] Frontend builds: `npm run build`.
- [ ] Rust tests still pass: `cargo test --manifest-path src-tauri/Cargo.toml`.
- [ ] Security audit passes: `npm audit --audit-level=moderate`.
- [ ] App can be manually opened and each section can be visited.
- [ ] No feature is represented as functional unless backed by real state or real configured provider behavior.

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Refactor breaks existing stateful flows | High | Keep domain modules unchanged; add App tests for task, draft, memory, and observation flows after navigation |
| Components become prop-heavy | Medium | Centralize app actions in `src/app/actions.ts`; pass focused callbacks to pages |
| Navigation hides important privacy state | Medium | Keep privacy status indicators visible in section nav or header |
| Desktop stage becomes decorative instead of useful | Medium | Show latest task status and emotional character presence; keep management controls out |
| Settings imply providers work before configuration | High | Preserve explicit `unconfigured` and `missing` statuses in Executor Settings |

## Open Questions

- Should the control console use tabs, a left sidebar, or a compact segmented control on desktop?
- Should the desktop stage remain the default first section, or should users land in the task room after the first task is created?
- Should navigation state be persisted in localStorage, or always reset to Desktop on app launch?

## Parallelization Opportunities

- Tasks 3-6 can be implemented in parallel after Tasks 1-2 if component contracts are stable.
- Tasks 7-8 can be implemented in parallel after Tasks 1-2.
- Task 9 must wait until all page extraction work is complete.
- Task 10 should happen last so documentation reflects the final UI.
