# PersonaDesk Phase 1 Thin Slice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a real, runnable PersonaDesk Phase 1 thin slice that proves desktop presence, multi-character roles, task autonomy, executor routing, memory confirmation, voice/observation privacy boundaries, and optional sync settings without pretending unavailable AI integrations work.

**Architecture:** Use a Tauri + Vite + React + TypeScript app. The browser UI owns the role console, desktop stage, task room, memory review, and settings; TypeScript domain modules own deterministic local behavior and persistence; Rust/Tauri owns OS-adjacent commands such as platform info and local agent detection. Cloud/model integrations that are not configured must be represented as unavailable executors, not mocked success.

**Tech Stack:** Tauri v2, Rust, Vite, React, TypeScript, Vitest, Testing Library, localStorage persistence, CSS modules via plain CSS.

---

## Scope Check

The full design includes many future subsystems. This plan implements the Phase 1 thin slice only:

- Real project scaffold and build/test commands.
- Real local state model for characters, role boundaries, tasks, memory, observation, voice, and sync settings.
- Real deterministic local executor for planning/checking text tasks.
- Real unavailable states for unconfigured model APIs and local agents.
- Real Tauri command for safe local agent detection.
- Real UI that lets a user create task runs, confirm memories, configure boundaries, start/stop observation sessions, and inspect executor availability.

The plan does not implement paid cloud APIs, voice cloning, video personality import, plugin marketplace, or unrestricted local command execution.

## File Structure

- `package.json` - npm scripts and frontend/Tauri dependencies.
- `package-lock.json` - locked npm dependency graph.
- `index.html` - Vite entry HTML.
- `vite.config.ts` - Vite, React, and Vitest config.
- `tsconfig.json` and `tsconfig.node.json` - TypeScript compiler settings.
- `src/main.tsx` - React entry.
- `src/App.tsx` - page composition and top-level interaction wiring.
- `src/styles.css` - PersonaDesk UI styling.
- `src/domain/types.ts` - shared TypeScript data contracts.
- `src/domain/defaultState.ts` - initial characters, boundaries, executors, settings.
- `src/domain/memory.ts` - memory candidate and confirmed-memory operations.
- `src/domain/tasks.ts` - task intake, autonomy loop, validation, and delivery logic.
- `src/domain/executors.ts` - executor registry, routing, and Tauri detection merge.
- `src/domain/observation.ts` - observation session state transitions and privacy checks.
- `src/domain/storage.ts` - versioned localStorage load/save.
- `src/domain/*.test.ts` - unit tests for non-UI behavior.
- `src-tauri/Cargo.toml` - Rust crate definition.
- `src-tauri/tauri.conf.json` - Tauri app configuration.
- `src-tauri/src/main.rs` - Tauri commands and app launch.
- `src-tauri/src/agent_detection.rs` - safe local agent detection.
- `src-tauri/src/agent_detection_tests.rs` - Rust unit tests for detection helpers.
- `docs/superpowers/specs/2026-06-15-personadesk-platform-design.md` - source spec.
- `docs/superpowers/plans/2026-06-15-personadesk-phase-1.md` - this plan.

## Task 1: Create the Runnable Project Scaffold

**Files:**
- Create: `package.json`
- Create: `index.html`
- Create: `vite.config.ts`
- Create: `tsconfig.json`
- Create: `tsconfig.node.json`
- Create: `src/main.tsx`
- Create: `src/App.tsx`
- Create: `src/styles.css`
- Create: `src-tauri/Cargo.toml`
- Create: `src-tauri/tauri.conf.json`
- Create: `src-tauri/src/main.rs`

- [x] **Step 1: Write the package and compiler files**

Create `package.json` with these scripts and dependencies:

```json
{
  "name": "personadesk",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "tauri": "tauri"
  },
  "dependencies": {
    "@tauri-apps/api": "^2.0.0",
    "lucide-react": "^0.468.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@tauri-apps/cli": "^2.0.0",
    "@testing-library/jest-dom": "^6.6.3",
    "@testing-library/react": "^16.1.0",
    "@types/react": "^18.3.12",
    "@types/react-dom": "^18.3.1",
    "@vitejs/plugin-react": "^4.3.4",
    "jsdom": "^25.0.1",
    "typescript": "^5.6.3",
    "vite": "^5.4.11",
    "vitest": "^2.1.5"
  }
}
```

Create `tsconfig.json` with strict React settings:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["DOM", "DOM.Iterable", "ES2020"],
    "allowJs": false,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "module": "ESNext",
    "moduleResolution": "Node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx"
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

- [x] **Step 2: Write the Vite and entry files**

Create `index.html`, `vite.config.ts`, `src/main.tsx`, `src/App.tsx`, and `src/styles.css` so `npm run dev` serves a visible PersonaDesk shell with no broken imports.

The first `src/App.tsx` should render the product name, one desktop stage region, one task room region, and one control console region.

- [x] **Step 3: Write the Tauri files**

Create `src-tauri/Cargo.toml`, `src-tauri/tauri.conf.json`, and `src-tauri/src/main.rs` with a minimal Tauri v2 app command:

```rust
#[tauri::command]
fn platform_name() -> &'static str {
    std::env::consts::OS
}
```

- [x] **Step 4: Install dependencies**

Run:

```bash
npm install
```

Expected: dependencies install and `package-lock.json` is created.

- [x] **Step 5: Verify scaffold builds**

Run:

```bash
npm run build
```

Expected: TypeScript succeeds and Vite creates `dist/`.

- [x] **Step 6: Commit scaffold**

```bash
git add package.json package-lock.json index.html vite.config.ts tsconfig.json tsconfig.node.json src src-tauri
git commit -m "feat: scaffold PersonaDesk desktop app"
```

## Task 2: Add Domain Contracts and Initial State

**Files:**
- Create: `src/domain/types.ts`
- Create: `src/domain/defaultState.ts`
- Test: `src/domain/defaultState.test.ts`

- [ ] **Step 1: Write failing tests for default data**

Create `src/domain/defaultState.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createInitialState } from "./defaultState";

describe("createInitialState", () => {
  it("creates emotional and task characters with separate permissions", () => {
    const state = createInitialState();
    const emotional = state.characters.find((character) => character.kind === "emotional");
    const task = state.characters.find((character) => character.kind === "task");

    expect(emotional).toBeDefined();
    expect(task).toBeDefined();
    expect(state.roleBoundaries[emotional!.roleBoundaryId].canCallExecutors).toBe(false);
    expect(state.roleBoundaries[task!.roleBoundaryId].canCallExecutors).toBe(true);
  });

  it("marks cloud executors unavailable until configured", () => {
    const state = createInitialState();
    const cloudExecutors = state.executors.filter((executor) => executor.type === "model-api");

    expect(cloudExecutors.length).toBeGreaterThan(0);
    expect(cloudExecutors.every((executor) => executor.status === "unconfigured")).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test and verify it fails**

Run:

```bash
npm test -- src/domain/defaultState.test.ts
```

Expected: FAIL because `src/domain/defaultState.ts` does not exist.

- [ ] **Step 3: Implement the contracts and initial state**

Create `src/domain/types.ts` with exported types for:

```ts
export type CharacterKind = "emotional" | "task";
export type ExecutorType = "model-api" | "local-model" | "local-agent" | "asr" | "tts" | "vision" | "deterministic";
export type ExecutorStatus = "available" | "unconfigured" | "missing" | "disabled";
export type MemoryLayer = "user-profile" | "shared-world" | "character-private" | "task" | "short-term" | "import-summary";
export type Sensitivity = "low" | "medium" | "high";
```

Define interfaces for `Character`, `RoleBoundary`, `Executor`, `Task`, `TaskRun`, `MemoryItem`, `MemoryCandidate`, `ObservationSession`, `SyncProfile`, and `PersonaDeskState` using the field names from the spec.

Create `src/domain/defaultState.ts` with `createInitialState()` returning:

- Two emotional characters.
- Three task characters.
- Separate boundaries for emotional and task roles.
- One available deterministic local executor.
- OpenAI-compatible and local-agent executors marked `unconfigured` or `missing`.
- Empty task runs, memory candidates, observation sessions, and local-first sync disabled.

- [ ] **Step 4: Run tests**

Run:

```bash
npm test -- src/domain/defaultState.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit domain contracts**

```bash
git add src/domain/types.ts src/domain/defaultState.ts src/domain/defaultState.test.ts
git commit -m "feat: add PersonaDesk domain state"
```

## Task 3: Implement Memory Candidate Review

**Files:**
- Create: `src/domain/memory.ts`
- Test: `src/domain/memory.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/domain/memory.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createInitialState } from "./defaultState";
import { confirmMemoryCandidate, proposeMemoryCandidate, rejectMemoryCandidate } from "./memory";

describe("memory review", () => {
  it("keeps proposed memories out of long-term memory until confirmed", () => {
    let state = createInitialState();
    state = proposeMemoryCandidate(state, {
      layer: "character-private",
      ownerCharacterId: "mira",
      text: "The user likes quiet encouragement during long tasks.",
      source: "conversation",
      sensitivity: "low",
      reason: "Stable interaction preference"
    });

    expect(state.memoryCandidates).toHaveLength(1);
    expect(state.memories).toHaveLength(0);

    state = confirmMemoryCandidate(state, state.memoryCandidates[0].id);

    expect(state.memoryCandidates).toHaveLength(0);
    expect(state.memories).toHaveLength(1);
    expect(state.memories[0].ownerCharacterId).toBe("mira");
  });

  it("rejects candidates without writing memory", () => {
    let state = createInitialState();
    state = proposeMemoryCandidate(state, {
      layer: "task",
      ownerCharacterId: null,
      text: "Summaries should include validation notes.",
      source: "task-run",
      sensitivity: "low",
      reason: "Reusable task preference"
    });

    state = rejectMemoryCandidate(state, state.memoryCandidates[0].id);

    expect(state.memoryCandidates).toHaveLength(0);
    expect(state.memories).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run the test and verify it fails**

Run:

```bash
npm test -- src/domain/memory.test.ts
```

Expected: FAIL because `memory.ts` does not exist.

- [ ] **Step 3: Implement memory operations**

Create functions:

- `proposeMemoryCandidate(state, input)`
- `confirmMemoryCandidate(state, candidateId)`
- `rejectMemoryCandidate(state, candidateId)`
- `deleteMemory(state, memoryId)`

Implementation must be immutable and must not move a candidate into `memories` until `confirmMemoryCandidate` is called.

- [ ] **Step 4: Run tests**

Run:

```bash
npm test -- src/domain/memory.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit memory review**

```bash
git add src/domain/memory.ts src/domain/memory.test.ts
git commit -m "feat: add confirmed memory workflow"
```

## Task 4: Implement Executor Registry and Safe Local Agent Detection

**Files:**
- Create: `src/domain/executors.ts`
- Test: `src/domain/executors.test.ts`
- Create: `src-tauri/src/agent_detection.rs`
- Modify: `src-tauri/src/main.rs`

- [ ] **Step 1: Write failing TypeScript tests**

Create `src/domain/executors.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createInitialState } from "./defaultState";
import { mergeDetectedLocalAgents, routeExecutorForTask } from "./executors";

describe("executor routing", () => {
  it("uses a task character default executor when available", () => {
    const state = createInitialState();
    const executor = routeExecutorForTask(state, {
      taskCharacterId: "orion",
      taskKind: "planning",
      requiresLocalAgent: false
    });

    expect(executor.id).toBe("local-planner");
    expect(executor.status).toBe("available");
  });

  it("does not pretend missing local agents are available", () => {
    const state = createInitialState();
    const next = mergeDetectedLocalAgents(state, [
      { id: "codex-cli", displayName: "Codex CLI", available: false, version: null }
    ]);

    expect(next.executors.find((executor) => executor.id === "codex-cli")?.status).toBe("missing");
  });
});
```

- [ ] **Step 2: Run the test and verify it fails**

Run:

```bash
npm test -- src/domain/executors.test.ts
```

Expected: FAIL because `executors.ts` does not exist.

- [ ] **Step 3: Implement TypeScript executor logic**

Create:

- `routeExecutorForTask(state, request)`
- `mergeDetectedLocalAgents(state, detectedAgents)`
- `executorDisclosure(executor)`

The router must return an available executor or a clearly unavailable executor with a status reason. It must never return `available` for unconfigured model APIs.

- [ ] **Step 4: Implement Rust local agent detection**

Create `src-tauri/src/agent_detection.rs` with:

- `DetectedAgent` struct.
- `detect_known_agents()` command helper.
- Safe executable lookup using `PATH`.
- Version probing only with harmless `--version` or `version` arguments.

Modify `src-tauri/src/main.rs` to expose:

```rust
.invoke_handler(tauri::generate_handler![platform_name, detect_local_agents])
```

- [ ] **Step 5: Run tests**

Run:

```bash
npm test -- src/domain/executors.test.ts
cargo test --manifest-path src-tauri/Cargo.toml
```

Expected: TypeScript tests PASS and Rust tests PASS.

- [ ] **Step 6: Commit executors**

```bash
git add src/domain/executors.ts src/domain/executors.test.ts src-tauri/src/main.rs src-tauri/src/agent_detection.rs
git commit -m "feat: add executor routing and agent detection"
```

## Task 5: Implement Task Autonomy Loop

**Files:**
- Create: `src/domain/tasks.ts`
- Test: `src/domain/tasks.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/domain/tasks.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createInitialState } from "./defaultState";
import { createTask, runAutonomyCycle } from "./tasks";

describe("task autonomy", () => {
  it("plans, executes, validates, and delivers with a real deterministic executor", () => {
    let state = createInitialState();
    state = createTask(state, {
      goal: "Draft a launch checklist for PersonaDesk",
      constraints: "Keep it local-first and privacy aware",
      desiredOutput: "Checklist",
      supervisionMode: "unsupervised",
      authorizationScope: "text-planning-only"
    });

    state = runAutonomyCycle(state, state.tasks[0].id);

    const run = state.taskRuns[0];
    expect(run.status).toBe("delivered");
    expect(run.taskTree.length).toBeGreaterThan(0);
    expect(run.validationResults.every((result) => result.passed)).toBe(true);
    expect(run.artifacts[0].content).toContain("PersonaDesk");
  });

  it("pauses when a task asks for access outside authorization scope", () => {
    let state = createInitialState();
    state = createTask(state, {
      goal: "Delete old files and publish the release",
      constraints: "Needs filesystem and external publishing",
      desiredOutput: "Published release",
      supervisionMode: "unsupervised",
      authorizationScope: "text-planning-only"
    });

    state = runAutonomyCycle(state, state.tasks[0].id);

    expect(state.taskRuns[0].status).toBe("blocked");
    expect(state.taskRuns[0].approvalRequests.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run the test and verify it fails**

Run:

```bash
npm test -- src/domain/tasks.test.ts
```

Expected: FAIL because `tasks.ts` does not exist.

- [ ] **Step 3: Implement task runtime**

Create:

- `createTask(state, input)`
- `runAutonomyCycle(state, taskId)`
- `requiresApproval(goal, constraints, authorizationScope)`
- `buildDeterministicArtifact(task)`
- `validateArtifact(task, artifact)`

The deterministic executor must be named and disclosed as local deterministic planning logic. It must not claim to be an AI model.

- [ ] **Step 4: Run tests**

Run:

```bash
npm test -- src/domain/tasks.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit task runtime**

```bash
git add src/domain/tasks.ts src/domain/tasks.test.ts
git commit -m "feat: add autonomous task runtime"
```

## Task 6: Implement Observation, Voice, Sync, and Persistence Boundaries

**Files:**
- Create: `src/domain/observation.ts`
- Create: `src/domain/storage.ts`
- Test: `src/domain/observation.test.ts`
- Test: `src/domain/storage.test.ts`

- [ ] **Step 1: Write failing observation tests**

Create `src/domain/observation.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createInitialState } from "./defaultState";
import { startObservationSession, stopObservationSession, summarizeObservationEvent } from "./observation";

describe("observation privacy", () => {
  it("requires an allowlisted app before adding summaries", () => {
    let state = createInitialState();
    state = startObservationSession(state, ["Safari"]);
    state = summarizeObservationEvent(state, state.observationSessions[0].id, {
      appName: "Terminal",
      summary: "User ran a command"
    });

    expect(state.observationSessions[0].localSummaryStream).toHaveLength(0);
  });

  it("stores local summaries for allowlisted apps only", () => {
    let state = createInitialState();
    state = startObservationSession(state, ["Safari"]);
    state = summarizeObservationEvent(state, state.observationSessions[0].id, {
      appName: "Safari",
      summary: "User reviewed a design document"
    });
    state = stopObservationSession(state, state.observationSessions[0].id);

    expect(state.observationSessions[0].localSummaryStream).toHaveLength(1);
    expect(state.observationSessions[0].active).toBe(false);
  });
});
```

- [ ] **Step 2: Write failing storage tests**

Create `src/domain/storage.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createInitialState } from "./defaultState";
import { deserializeState, serializeState } from "./storage";

describe("state storage", () => {
  it("round-trips the current state version", () => {
    const state = createInitialState();
    const serialized = serializeState(state);
    const restored = deserializeState(serialized);

    expect(restored.characters.map((character) => character.id)).toEqual(
      state.characters.map((character) => character.id)
    );
    expect(restored.syncProfile.enabled).toBe(false);
  });

  it("falls back to a safe initial state for unknown versions", () => {
    const restored = deserializeState(JSON.stringify({ version: 999, state: { characters: [] } }));

    expect(restored.characters.length).toBeGreaterThan(0);
    expect(restored.syncProfile.enabled).toBe(false);
  });
});
```

- [ ] **Step 3: Implement observation and storage**

Observation must never store raw screenshots or raw frames. It stores only typed local summary events with app/window metadata.

Storage must use a versioned envelope:

```ts
{
  "version": 1,
  "state": { "...": "PersonaDeskState" }
}
```

- [ ] **Step 4: Run tests**

Run:

```bash
npm test -- src/domain/observation.test.ts src/domain/storage.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit privacy boundaries**

```bash
git add src/domain/observation.ts src/domain/storage.ts src/domain/observation.test.ts src/domain/storage.test.ts
git commit -m "feat: add observation and storage boundaries"
```

## Task 7: Build the PersonaDesk UI Thin Slice

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/styles.css`
- Test: `src/App.test.tsx`

- [ ] **Step 1: Write failing UI tests**

Create `src/App.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import App from "./App";

describe("PersonaDesk app", () => {
  it("shows emotional characters, task characters, and executor status", () => {
    render(<App />);

    expect(screen.getByText("PersonaDesk")).toBeInTheDocument();
    expect(screen.getByText("Emotional Characters")).toBeInTheDocument();
    expect(screen.getByText("Task Characters")).toBeInTheDocument();
    expect(screen.getByText("Executor Registry")).toBeInTheDocument();
  });

  it("can run a local deterministic task from the UI", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.type(screen.getByLabelText("Task goal"), "Create a privacy checklist");
    await user.click(screen.getByRole("button", { name: "Run autonomous task" }));

    expect(await screen.findByText("Delivered")).toBeInTheDocument();
    expect(screen.getByText(/privacy checklist/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the UI test and verify it fails**

Run:

```bash
npm test -- src/App.test.tsx
```

Expected: FAIL because UI does not yet expose the required labels and interactions.

- [ ] **Step 3: Implement UI panels**

`src/App.tsx` must include:

- Desktop stage with emotional character cards.
- Task stage with task character cards.
- Task intake form.
- Task card list with delivered/blocked states.
- Memory candidate review panel.
- Executor registry panel with unavailable states visible.
- Observation panel with allowlist input and local summaries.
- Voice settings panel showing provider slots and configured/unconfigured state.
- Sync panel showing local-first default and optional sync toggle.

- [ ] **Step 4: Style the UI**

`src/styles.css` must use a restrained cross-platform desktop app style. Avoid marketing hero layout. Use dense panels, compact controls, tabs or segmented controls where useful, clear status chips, and no decorative gradient-orb backgrounds.

- [ ] **Step 5: Run UI tests and build**

Run:

```bash
npm test -- src/App.test.tsx
npm run build
```

Expected: PASS and build succeeds.

- [ ] **Step 6: Commit UI**

```bash
git add src/App.tsx src/App.test.tsx src/styles.css
git commit -m "feat: build PersonaDesk thin-slice UI"
```

## Task 8: Add Documentation and Final Verification

**Files:**
- Create: `README.md`
- Modify: `docs/superpowers/plans/2026-06-15-personadesk-phase-1.md`

- [ ] **Step 1: Write README**

Create `README.md` with:

- What PersonaDesk is.
- Phase 1 capabilities.
- What is real now.
- What requires configuration.
- Privacy defaults.
- Setup commands.
- Test commands.

- [ ] **Step 2: Run all verification**

Run:

```bash
npm test
npm run build
cargo test --manifest-path src-tauri/Cargo.toml
```

Expected: all tests pass and frontend build succeeds.

- [ ] **Step 3: Update plan checkboxes**

Mark each completed step in this plan with `[x]`.

- [ ] **Step 4: Commit docs and plan completion**

```bash
git add README.md docs/superpowers/plans/2026-06-15-personadesk-phase-1.md
git commit -m "docs: add PersonaDesk implementation guide"
```

- [ ] **Step 5: Push branch**

Run:

```bash
git push
```

Expected: branch pushes to GitHub successfully.

## Completion Criteria

The plan is complete only when:

- `npm test` passes.
- `npm run build` passes.
- `cargo test --manifest-path src-tauri/Cargo.toml` passes.
- The UI exposes real state transitions for characters, task runs, memory review, observation summaries, executor status, voice provider slots, and sync settings.
- Missing/unconfigured AI providers are displayed honestly as unavailable or unconfigured.
- No raw observation frames, raw imports, or fake cloud responses are generated by the app.
- All plan checkboxes are marked complete.
- Changes are committed and pushed.
