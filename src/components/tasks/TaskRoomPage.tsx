import { Bot, Check, Play } from "lucide-react";
import type { AppActions, TaskFormState } from "../../app/actions";
import type { Character, RoleBoundary, Task, TaskRun } from "../../domain/types";
import { CharacterCard } from "../characters/CharacterCard";
import { Panel } from "../ui/Panel";
import { TaskCard } from "./TaskCard";

export function TaskRoomPage({
  taskCharacters,
  roleBoundaries,
  tasks,
  taskRuns,
  taskForm,
  setTaskForm,
  actions
}: {
  taskCharacters: Character[];
  roleBoundaries: Record<string, RoleBoundary>;
  tasks: Task[];
  taskRuns: TaskRun[];
  taskForm: TaskFormState;
  setTaskForm: (next: TaskFormState) => void;
  actions: AppActions;
}) {
  return (
    <div className="page-grid task-room-page">
      <Panel
        className="primary-page-panel"
        description="Start supervised or unsupervised work with explicit constraints and authorization."
        icon={<Play aria-hidden="true" size={19} />}
        title="Task Room"
      >
        <form className="task-form" onSubmit={actions.runTask}>
          <label>
            Task goal
            <input
              value={taskForm.goal}
              onChange={(event) => setTaskForm({ ...taskForm, goal: event.target.value })}
              placeholder="Create a privacy checklist"
            />
          </label>
          <label>
            Constraints
            <input
              value={taskForm.constraints}
              onChange={(event) => setTaskForm({ ...taskForm, constraints: event.target.value })}
            />
          </label>
          <label>
            Desired output
            <input
              value={taskForm.desiredOutput}
              onChange={(event) => setTaskForm({ ...taskForm, desiredOutput: event.target.value })}
            />
          </label>
          <div className="settings-grid">
            <label>
              Supervision mode
              <select
                value={taskForm.supervisionMode}
                onChange={(event) =>
                  setTaskForm({
                    ...taskForm,
                    supervisionMode: event.target.value as TaskFormState["supervisionMode"]
                  })
                }
              >
                <option value="unsupervised">unsupervised</option>
                <option value="supervised">supervised</option>
              </select>
            </label>
            <label>
              Authorization scope
              <select
                value={taskForm.authorizationScope}
                onChange={(event) => setTaskForm({ ...taskForm, authorizationScope: event.target.value })}
              >
                <option value="text-planning-only">Text planning only</option>
                <option value="text-planning-only destructive-filesystem">Text planning + destructive filesystem</option>
                <option value="text-planning-only external-publishing">Text planning + external publishing</option>
                <option value="text-planning-only destructive-filesystem external-publishing">
                  Text planning + destructive filesystem + external publishing
                </option>
                <option value="text-planning-only destructive-filesystem external-publishing payment sensitive-data-access">
                  Expanded sensitive operation review
                </option>
              </select>
            </label>
          </div>
          <button className="primary-button" type="submit">
            <Play aria-hidden="true" size={16} />
            Run autonomous task
          </button>
        </form>
      </Panel>

      <Panel description="Task characters can plan, execute, validate, and request approval." icon={<Bot aria-hidden="true" size={19} />} title="Task Characters">
        <div className="card-list">
          {taskCharacters.map((character) => (
            <CharacterCard
              boundaryLabel={roleBoundaries[character.roleBoundaryId].label}
              character={character}
              key={character.id}
            />
          ))}
        </div>
      </Panel>

      <Panel
        className="wide-panel"
        description="Long-task autonomy records plan, execution, validation, artifacts, and approval gates."
        icon={<Check aria-hidden="true" size={19} />}
        title="Task Cards"
      >
        {taskRuns.length === 0 ? (
          <p className="empty-state">No task run yet.</p>
        ) : (
          <div className="task-card-list">
            {taskRuns.map((run) => (
              <TaskCard key={run.id} run={run} task={tasks.find((item) => item.id === run.taskId)} />
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}
