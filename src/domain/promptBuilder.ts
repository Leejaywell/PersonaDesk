import type { Character, MemoryItem, PersonaDeskState, Task } from "./types";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export function buildSystemPrompt(character: Character, memories: MemoryItem[]): string {
  const parts = [
    `You are ${character.name}, a companion in a local desktop companion app called PersonaDesk.`,
    `Persona summary: ${character.personaSummary}`,
    `Speaking style: ${character.speakingStyle}`,
    `Relationship context: ${character.customRelationship}`,
  ];

  // Inject user profile memories
  const userProfile = memories.filter((m) => m.layer === "user-profile");
  if (userProfile.length > 0) {
    parts.push("\n[User Profile Fact Sheet]:");
    userProfile.forEach((m) => parts.push(`- ${m.text}`));
  }

  // Inject shared world memories
  const sharedWorld = memories.filter((m) => m.layer === "shared-world");
  if (sharedWorld.length > 0) {
    parts.push("\n[Shared World Facts]:");
    sharedWorld.forEach((m) => parts.push(`- ${m.text}`));
  }

  // Inject character private memories
  const privateMemories = memories.filter(
    (m) => m.layer === "character-private" && m.ownerCharacterId === character.id
  );
  if (privateMemories.length > 0) {
    parts.push("\n[Your Private Memories/Impressions]:");
    privateMemories.forEach((m) => parts.push(`- ${m.text}`));
  }

  parts.push(
    "\nConstraint: Keep your response short, conversational, and aligned with your persona. Since this is local-first, do not assume you have access to external APIs or tools unless explicitly authorized."
  );

  return parts.join("\n");
}

export function buildChatMessages(
  character: Character,
  memories: MemoryItem[],
  history: Array<{ speaker: "user" | "character"; text: string }>
): ChatMessage[] {
  const systemPrompt = buildSystemPrompt(character, memories);
  const messages: ChatMessage[] = [{ role: "system", content: systemPrompt }];

  history.forEach((msg) => {
    messages.push({
      role: msg.speaker === "user" ? "user" : "assistant",
      content: msg.text,
    });
  });

  return messages;
}

export function buildTaskPrompt(task: Task, memories: MemoryItem[]): ChatMessage[] {
  const systemPrompt = [
    "You are an AI planner/executor in a collaborative task orchestration platform.",
    "Your goal is to build a structured plan or checklist to address the user's goal.",
    "You must follow these instructions strictly.",
    "Constraint 1: Local-first. Propose local steps, check files and configurations locally.",
    "Constraint 2: Respect authorization scopes.",
  ].join("\n");

  const userContent = [
    `Goal: ${task.goal}`,
    `Constraints: ${task.constraints}`,
    `Desired Output Format: ${task.desiredOutput}`,
    `Priority: ${task.priority}`,
  ];

  const taskMemories = memories.filter((m) => m.layer === "task" || m.layer === "shared-world");
  if (taskMemories.length > 0) {
    userContent.push("\n[Relevant memories/context]:");
    taskMemories.forEach((m) => userContent.push(`- ${m.text}`));
  }

  userContent.push("\nGenerate the artifact. Start with a direct implementation plan, then checklist items.");

  return [
    { role: "system", content: systemPrompt },
    { role: "user", content: userContent.join("\n") },
  ];
}
