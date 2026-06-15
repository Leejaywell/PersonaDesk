# PersonaDesk AI Desktop Companion Platform Design

Date: 2026-06-15

## Summary

PersonaDesk is a cross-platform desktop companion platform where users can create multiple emotional characters and task characters. Emotional characters provide presence, companionship, observation, commentary, and relationship continuity. Task characters collaborate in task rooms, choose executors, run long tasks, validate their own work, and deliver results back to the user.

Phase 1 is an end-to-end thin slice. It should prove that the complete loop works: desktop presence, multi-character interaction, task collaboration, executor routing, memory confirmation, voice, screen observation, privacy controls, and optional sync. Each capability should be minimal but real.

## Product Direction

The platform is an open desktop AI character system, not a single-purpose assistant. It should eventually support:

- Desktop pets with persistent presence.
- Multiple emotional characters with configurable relationships.
- Multiple task characters that can collaborate and execute.
- AI model APIs, local models, and local AI agents as unified executors.
- Character generation from images and text imports, later expanding to voice and video.
- Multi-layer memory with user review and role-specific permissions.
- Voice input and voice output.
- Screen observation with strong privacy gates.
- Optional cloud sync for confirmed, non-raw user data.

The user is the final decision-maker. In the product metaphor, the user can be treated as the "president" or "CEO"; characters may advise, accompany, execute, and report, but they do not own final authority.

## Phase 1 Goals

Phase 1 should validate the platform shape through a thin but complete slice:

1. Run as a Tauri desktop app on macOS, Windows, and Linux.
2. Show a mixed desktop presence model: emotional characters can stay on the desktop, while task characters usually live in a task stage or meeting room.
3. Support multiple emotional characters and multiple task characters.
4. Let users configure relationship templates, boundaries, proactive behavior, memory permissions, appearance, and voice.
5. Let users create character drafts from image and text imports, with user confirmation before activation.
6. Let users start a task by setting a goal, constraints, expected output, and authorization scope.
7. Let task characters plan, split work, choose executors, run, test, validate, revise, and deliver.
8. Support both supervised task mode and unsupervised long-task mode.
9. Treat model APIs, local models, and local AI agents or CLI tools as unified executors.
10. Use multi-layer memory with AI-generated candidates that require user confirmation before long-term write.
11. Provide ASR and TTS provider slots so users can speak to characters and characters can speak back.
12. Provide manual screen observation sessions with app/window allowlists, local visual summaries first, and explicit confirmation before cloud vision upload.
13. Provide optional sync for confirmed role settings, long-term memory summaries, and non-sensitive configuration.

## Phase 1 Non-Goals

Phase 1 should not attempt to complete the whole future platform:

- No full plugin marketplace.
- No community role marketplace.
- No advanced Live2D or Spine authoring, only interface reservation.
- No voice or video personality cloning from media imports.
- No default upload of raw images, chat logs, screen frames, or task logs.
- No fully cloud-first account model.
- No unrestricted local agent execution.

## Recommended Approach

Use an end-to-end thin slice platform kernel.

This approach creates the long-term architecture early while keeping each capability minimal. It is better than building only the companion experience first or only the task-agent system first, because the product depends on the combination: characters should feel alive, but the task system also needs real executor routing and delivery.

## Architecture

The platform is split into clear layers:

### Desktop Experience Layer

Owns user-facing surfaces:

- Floating emotional character windows.
- Task stage or meeting room.
- Task cards.
- Control console.
- Tray/menu bar integration.
- Notifications.
- Quick desktop interactions and character bubbles.

Desktop interactions should remain light. Complex configuration belongs in the control console.

### Character Runtime Layer

Owns character identity and behavior:

- Emotional characters.
- Task characters.
- Relationship templates.
- Custom relationship settings.
- Appearance state.
- Voice settings.
- Proactive behavior rules.
- Role boundaries.
- Memory permissions.

Character behavior should be driven by structured configuration, not by hard-coded prompt fragments scattered across the UI.

### Task Orchestration Layer

Owns collaborative work:

- Task intake.
- Planning.
- Role assignment.
- Meeting room events.
- Efficiency view.
- Theater view.
- Long-task autonomy loop.
- Validation and revision.
- Delivery packaging.

The task orchestration layer should maintain factual task state. The theater view can present character discussion and emotion, but it must not replace the underlying task record.

### Executor Layer

Owns calls to external or local intelligence:

- OpenAI-compatible APIs.
- Official provider adapters where needed.
- Local model services.
- Local AI agents and CLI tools such as Codex, Claude Code, Cursor, and Gemini CLI where detectable.
- ASR providers.
- TTS providers.
- Vision providers.

All executors are represented by one abstraction. There is no product-level split between "advanced" local agents and ordinary model APIs. The differences are capability, cost, speed, context size, required permission, and risk.

### Memory Layer

Owns durable and short-lived context:

- User profile memory.
- Shared world memory.
- Character private memory.
- Task memory.
- Short-term session memory.
- Import-source summaries.
- Memory candidate queue.

Long-term memory is written only after user confirmation.

### Observation and Voice Layer

Owns live perception and speech:

- ASR input.
- TTS output.
- Manual observation sessions.
- App/window allowlists.
- Local visual summaries.
- Cloud vision confirmation gates.

Observation and voice should be provider-based so local and cloud implementations can coexist.

### Tauri Local System Layer

Owns OS-facing capabilities:

- Window management.
- Transparent or always-on-top windows where supported.
- Tray integration.
- Startup behavior.
- Process and local agent detection.
- Local file and command boundaries.
- Local database.
- Encrypted secret storage.

Tauri is preferred because the product is local-first, privacy-sensitive, and needs a strong native layer.

### Privacy and Permission Layer

Cuts across every other layer:

- Executor authorization.
- Memory write confirmation.
- Observation authorization.
- Cloud upload confirmation.
- Data retention policy.
- Sync boundaries.
- Local secret handling.

Privacy must be designed as a first-class system concern rather than a settings page added later.

### Optional Sync Layer

Owns cloud continuity:

- Confirmed character definitions.
- Confirmed long-term memory summaries.
- Non-sensitive settings.
- Sync profile and conflict state.

Raw imports, raw screenshots, sensitive memories, and detailed execution logs remain local by default.

## Character System

### User Role

The user is the final decision-maker. The system can frame the user as a "president" or "CEO" in role-play language, but implementation should treat this as an authority model:

- The user sets goals.
- The user creates and edits characters.
- The user approves sensitive actions.
- The user confirms long-term memory.
- The user accepts or rejects deliverables.

### Emotional Characters

Emotional characters represent relationship and presence. They may be companions, partners, friends, family-like roles, housekeeper roles, observers, or custom relationship types.

They can:

- Stay visible on the desktop.
- Chat with the user.
- Watch allowed observation sessions.
- Comment on task progress if configured.
- Talk with task characters if configured.
- Apply for memory writes within their permission scope.
- Offer emotional framing, reminders, summaries, reactions, and companionship.

They do not call tools or execute tasks by default.

Each emotional character has configurable:

- Relationship template.
- Custom name and address terms.
- Interaction boundaries.
- Proactive frequency.
- Trigger conditions.
- Do-not-disturb rules.
- Visibility in task rooms.
- Permission to comment on tasks.
- Permission to talk with task characters.
- Memory permission scope.
- Appearance backend and state set.
- Voice provider and voice style.

### Task Characters

Task characters represent capability and responsibility. Examples include researcher, planner, engineer, editor, reviewer, tester, analyst, or operator.

They can:

- Join task rooms.
- Discuss and split work.
- Use default executors.
- Accept router suggestions to use other executors.
- Call permitted executors.
- Produce artifacts.
- Validate results.
- Report progress.
- Apply for task-related memory writes.

Each task character has:

- Capability profile.
- Default executor.
- Permission profile.
- Collaboration style.
- Validation responsibility.
- Memory scope.
- Visibility and speech style.

### Role Boundaries

Role boundaries are explicit. They should include:

- Can observe task room.
- Can comment in task room.
- Can speak to task characters.
- Can speak only to the user.
- Can call executors.
- Can access observation summaries.
- Can request memory writes.
- Can participate in validation.

This allows emotional characters and task characters to coexist without confusing companionship with execution authority.

## Desktop Presence

Phase 1 uses a mixed desktop presence model:

- Emotional characters can live independently on the desktop.
- Task characters are usually contained in a task stage or meeting room.
- The task stage can expand when work is active and collapse when idle.
- The control console handles deep configuration.

This keeps companionship visible while preventing task agents from cluttering the desktop.

## Appearance System

Phase 1 supports multiple appearance backends:

- Static avatar or sticker.
- 2D animation state package.

The interface should reserve future support for Live2D or Spine-like models.

Minimum state names should include:

- Idle.
- Listening.
- Speaking.
- Thinking.
- Happy.
- Concerned.
- Watching.
- Task active.
- Waiting for user.

## Character Generation

Phase 1 supports light character draft generation from:

- Uploaded images.
- Imported text or chat records.

The result is only a draft. The user must review and confirm before it becomes an active character.

The draft can include:

- Name suggestions.
- Relationship suggestion.
- Personality summary.
- Speaking style.
- Boundaries.
- Memory permission recommendation.
- Appearance suggestions.
- Voice style suggestion.

Users choose whether import processing happens locally or through a cloud model. The UI must show what data may be sent before any cloud call.

Raw source material is not stored long-term by default. The system stores confirmed summaries and necessary references only.

## Task Collaboration

### Task Intake

A task starts with:

- Goal.
- Constraints.
- Desired output.
- Deadline or priority.
- Allowed executors.
- Authorization scope.
- Supervision preference.

The user can choose supervised mode or unsupervised long-task mode.

### Long-Task Autonomy

In unsupervised mode, the user can provide only the task goal and authorization scope. The system then runs an autonomous loop:

1. Plan.
2. Split work.
3. Assign roles.
4. Choose executors.
5. Execute.
6. Validate.
7. Revise.
8. Package delivery.
9. Ask for final user acceptance.

The task can run for a long time without active user supervision, but it must pause when it reaches a permission boundary.

### Permission Pause Points

The system must pause and request user confirmation for:

- Actions outside the task authorization scope.
- Deletion or destructive file operations.
- Publishing or sending content externally.
- Payments or purchases.
- External account use.
- Access to sensitive files.
- Uploading raw screenshots or raw imports to cloud models.
- High-risk commands.
- Any action the configured permission policy marks as requiring approval.

### Task Delivery

Tasks are delivered through task cards and desktop character feedback.

A task card should include:

- Goal.
- Status.
- Assigned roles.
- Task tree.
- Major decisions.
- Executor calls.
- Artifacts.
- Validation results.
- Open issues.
- User approval requests.
- Final summary.

Task cards may show execution summaries and links to artifacts. Detailed local agent logs and raw command output remain local by default and are not synced unless the user explicitly exports or shares them.

Emotional characters may comment on completion, summarize the experience, or help the user review the outcome if allowed.

## Executor System

An executor is any capability provider that can perform work for a character or system service.

Executor types include:

- Chat model API.
- Vision model API.
- Local model server.
- Local AI agent.
- CLI agent.
- ASR provider.
- TTS provider.

Every executor should expose:

- Identifier.
- Display name.
- Type.
- Capabilities.
- Context limits.
- Cost profile if known.
- Latency profile if known.
- Input and output modalities.
- Required secrets.
- Permission risk level.
- Availability status.
- Health check.

### Routing

Routing uses a hybrid model:

- Each task character has a default executor.
- The router can recommend switching based on task type, cost, speed, context size, modality, or risk.
- The user can override executor choice.
- Router decisions are recorded in the task run.

### Local Agent Detection

Phase 1 should detect available local agents where possible. Detection should be read-only and safe:

- Check known executable names.
- Check known install paths.
- Check environment availability.
- Run harmless version or help commands only when appropriate.
- Ask for user approval before using an agent for real work.

## Memory System

The memory system is multi-layered.

### User Profile Memory

Stores user-level preferences, boundaries, names, recurring goals, and long-term habits.

### Shared World Memory

Stores facts all relevant characters can know:

- Major user events.
- Relationship changes.
- Completed task outcomes.
- Shared commitments.

### Character Private Memory

Stores a character's subjective understanding:

- How this character relates to the user.
- What this character has experienced with the user.
- Preferences this character is allowed to remember.
- Impressions of other characters.

### Task Memory

Stores task-specific facts:

- Goal.
- Plan.
- Decisions.
- Results.
- Validation notes.
- Reusable lessons.

### Short-Term Context Memory

Stores current conversation, active task context, active observation session summaries, and recent character events.

### Memory Candidate Queue

AI may propose memory candidates. A candidate includes:

- Proposed memory text.
- Memory layer.
- Source.
- Owner character if any.
- Sensitivity level.
- Reason for remembering.
- Expiration suggestion if any.

The user reviews candidates before long-term write. Different characters can have different permission scopes. Companion-like characters may request richer relationship memories. Task characters default to task-related memory only.

### Context Injection

Memory retrieval should be selective. It should consider:

- Current character.
- Current task.
- Relationship.
- Recentness.
- Importance.
- Sensitivity.
- User-approved scope.

The system should avoid injecting all memories into every model call.

## Observation System

Phase 1 supports continuous screen observation only inside explicit observation sessions.

Rules:

- User manually starts observation.
- User selects allowed apps or windows.
- The system prefers local visual summarization.
- Raw frames are not stored long-term by default.
- Raw frames or screenshots are not uploaded to cloud models without explicit confirmation.
- Observation can be stopped at any time.
- Characters can only access observation summaries within their permissions.

Emotional characters may use observation to accompany the user while watching, reading, browsing, or working. Task characters may use observation summaries only when the task authorization allows it.

## Voice System

Phase 1 includes ASR and TTS provider slots.

Minimum behavior:

- User can speak to the system.
- Transcripts can be routed to the active character or task room.
- Characters can respond through TTS.
- Each character can configure voice, speed, and emotional intensity.
- Provider choice can be local or cloud.
- Cloud voice providers follow the same data disclosure rules as other cloud calls.

## Sync Model

The platform is local-first with optional sync.

Default:

- Local data is authoritative.
- No account is required.
- Secrets are stored locally.
- Raw imports and raw observation data stay local unless explicitly shared.

With sync enabled:

- Confirmed character definitions can sync.
- Confirmed long-term memory summaries can sync.
- Non-sensitive settings can sync.
- Sync conflicts are reviewed with local-first preference.

Data that does not sync by default:

- Raw uploaded images.
- Raw chat imports.
- Raw audio.
- Raw screen frames or screenshots.
- Detailed local agent execution logs.
- Sensitive memory entries marked local-only.

## Core Data Objects

### Character

Represents a role-bearing character.

Fields:

- id.
- name.
- type: emotional or task.
- relationship template.
- custom relationship data.
- persona summary.
- speaking style.
- appearance profile.
- voice profile.
- proactive behavior profile.
- memory permission profile.
- role boundary id.
- default executor id for task characters.

### RoleBoundary

Represents what a character may do.

Fields:

- can observe tasks.
- can comment on tasks.
- can talk to task characters.
- can private-chat user.
- can call executors.
- can access observation summaries.
- can request memory writes.
- can validate task outputs.

### Executor

Represents a model, local agent, or provider.

Fields:

- id.
- display name.
- type.
- capabilities.
- modalities.
- context limit.
- cost profile.
- latency profile.
- permission risk level.
- secret reference.
- health status.
- detection source.

### Task

Represents the user's goal.

Fields:

- id.
- title.
- goal.
- constraints.
- desired output.
- supervision mode.
- authorization scope.
- status.
- created by.
- created at.

### TaskRun

Represents one execution attempt.

Fields:

- id.
- task id.
- assigned characters.
- task tree.
- executor calls.
- decisions.
- logs.
- validation results.
- artifacts.
- approval requests.
- final summary.

### MemoryItem

Represents confirmed long-term memory.

Fields:

- id.
- layer.
- owner character id if any.
- text.
- source.
- sensitivity.
- created at.
- updated at.
- sync policy.

### MemoryCandidate

Represents proposed memory before confirmation.

Fields:

- id.
- proposed layer.
- proposed owner.
- proposed text.
- source event.
- sensitivity.
- reason.
- status.

### ObservationSession

Represents an active or completed observation session.

Fields:

- id.
- allowed apps/windows.
- active state.
- local summary stream.
- cloud upload approvals.
- retention policy.
- started at.
- ended at.

### SyncProfile

Represents sync behavior.

Fields:

- enabled.
- account id.
- allowed data classes.
- local-only classes.
- conflict policy.
- last sync status.

## Error Handling

The product should fail safely and visibly.

### Executor Failure

If an executor fails:

- Retry if the failure is transient.
- Fall back to another executor if policy allows.
- Record the reason in the task run.
- Ask the user if no safe fallback exists.

### Long Task Blocked

If a long task cannot continue:

- Mark the task blocked.
- Summarize what was tried.
- Identify the exact needed user input or permission.
- Preserve partial artifacts.

### Memory Conflict

If a proposed memory conflicts with existing memory:

- Do not overwrite automatically.
- Show both versions.
- Ask the user to merge, replace, keep both, or discard.

### Observation Boundary Violation

If observation reaches a non-allowed window or app:

- Stop processing that source.
- Notify the user.
- Do not persist the forbidden content.

### Cloud Upload Risk

Before cloud upload of raw imports, screenshots, sensitive memory, or raw audio:

- Show the data type.
- Show destination provider.
- Require explicit confirmation.

### Sync Conflict

When synced data conflicts:

- Prefer local data by default.
- Show differences.
- Let the user choose per item.

## Testing Strategy

Phase 1 testing should focus on behavior and boundaries.

### Role Permission Tests

- Emotional characters cannot call executors unless explicitly allowed.
- Emotional characters can observe or comment only when configured.
- Task characters cannot access private emotional memory outside scope.

### Executor Routing Tests

- Default executor selection works.
- Router suggestions are recorded.
- User overrides are respected.
- Failed executors fall back only when allowed.

### Memory Tests

- AI candidates do not become long-term memory before user confirmation.
- Character memory permissions constrain candidate ownership.
- Deleted memories are not injected later.
- Sensitive memories marked local-only do not sync.

### Task Autonomy Tests

- A task can plan, execute, validate, revise, and deliver.
- Long tasks pause at permission boundaries.
- Validation results appear in the task card.
- Partial results persist when blocked.

### Privacy Tests

- Raw imports are not retained by default.
- Observation requires manual start.
- Non-allowlisted windows are ignored.
- Raw screenshots are not uploaded without confirmation.
- Cloud calls display relevant data disclosure.

### Desktop Smoke Tests

Run on macOS, Windows, and Linux:

- App starts.
- Tray/menu integration works.
- Floating character window appears.
- Task stage opens and closes.
- Notifications appear.
- Microphone permission flow works.
- TTS plays audio.
- Observation start/stop works where supported.

## Roadmap

### Phase 1: Platform Thin Slice

Build the minimal complete platform loop described in this document.

### Phase 2: Character Generation Depth

Add richer image interpretation, voice and video personality extraction, more appearance backends, and role draft comparison.

### Phase 3: Executor Ecosystem

Add executor manifests, community executors, stronger local sandboxing, deeper local agent integrations, and richer routing policies.

### Phase 4: Long-Term Relationship and Multi-Device Continuity

Deepen memory versioning, sync, cross-device presence, family/team spaces, and long-running character continuity.

## Reference

- [rullerzhou-afk/clawd-on-desk](https://github.com/rullerzhou-afk/clawd-on-desk) is a useful reference for desktop multi-agent presence, agent status tracking, and local AI assistant integration patterns. PersonaDesk should borrow the general idea of visible local agents, but extend it into an open character platform with emotional roles, memory permissions, observation, voice, and executor routing.
