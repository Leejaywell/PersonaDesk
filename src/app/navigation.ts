export type SectionId = "desktop" | "tasks" | "characters" | "memory" | "executors" | "privacy";

export interface ProductSection {
  id: SectionId;
  label: string;
  description: string;
}

export const productSections: ProductSection[] = [
  {
    id: "desktop",
    label: "Desktop",
    description: "Companion presence and light status"
  },
  {
    id: "tasks",
    label: "Tasks",
    description: "Autonomous task room"
  },
  {
    id: "characters",
    label: "Characters",
    description: "Role studio and drafts"
  },
  {
    id: "memory",
    label: "Memory",
    description: "Candidate review"
  },
  {
    id: "executors",
    label: "Executors",
    description: "Model, local, voice, and tool slots"
  },
  {
    id: "privacy",
    label: "Privacy",
    description: "Observation and sync boundaries"
  }
];
