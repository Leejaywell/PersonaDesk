import { describe, expect, it } from "vitest";
import { buildSystemPrompt, buildChatMessages, buildTaskPrompt } from "./promptBuilder";
import type { Character, MemoryItem, Task } from "./types";

describe("Prompt Builder", () => {
  const mockCharacter: Character = {
    id: "mira",
    name: "Mira",
    kind: "emotional",
    relationshipTemplate: "partner",
    customRelationship: "A warm companion who watches the user's day and reflects gently.",
    personaSummary: "Emotionally observant, reassuring, and quietly witty.",
    speakingStyle: "Soft, direct, and intimate without taking control.",
    capabilityProfile: ["companionship"],
    appearance: {
      backend: "static",
      avatarLabel: "M",
      accent: "#b45309",
      supportedStates: ["idle"]
    },
    voice: {
      providerId: null,
      voiceName: "Warm alto",
      speed: 1,
      emotionalIntensity: 0.7,
      status: "unconfigured"
    },
    proactiveBehavior: {
      frequency: "balanced",
      triggers: ["user-idle"],
      doNotDisturb: false
    },
    memoryPermissionProfile: ["relationship"],
    roleBoundaryId: "boundary-emotional-companion",
    defaultExecutorId: null
  };

  const mockMemories: MemoryItem[] = [
    {
      id: "mem-1",
      layer: "user-profile",
      ownerCharacterId: null,
      text: "The user prefers coding in React and TypeScript.",
      source: "conversation",
      sensitivity: "low",
      createdAt: "2026-06-16T12:00:00Z",
      updatedAt: "2026-06-16T12:00:00Z",
      syncPolicy: "local-only"
    },
    {
      id: "mem-2",
      layer: "character-private",
      ownerCharacterId: "mira",
      text: "The user is often tired on Monday afternoons.",
      source: "conversation",
      sensitivity: "low",
      createdAt: "2026-06-16T12:00:00Z",
      updatedAt: "2026-06-16T12:00:00Z",
      syncPolicy: "local-only"
    }
  ];

  it("builds a system prompt injecting memories", () => {
    const prompt = buildSystemPrompt(mockCharacter, mockMemories);
    expect(prompt).toContain("You are Mira");
    expect(prompt).toContain("A warm companion who watches the user's day and reflects gently.");
    expect(prompt).toContain("[User Profile Fact Sheet]:");
    expect(prompt).toContain("- The user prefers coding in React and TypeScript.");
    expect(prompt).toContain("[Your Private Memories/Impressions]:");
    expect(prompt).toContain("- The user is often tired on Monday afternoons.");
  });

  it("builds chat messages history", () => {
    const history = [
      { speaker: "user" as const, text: "Hello Mira" },
      { speaker: "character" as const, text: "Hello! How is your day?" }
    ];
    const messages = buildChatMessages(mockCharacter, mockMemories, history);
    expect(messages).toHaveLength(3);
    expect(messages[0].role).toBe("system");
    expect(messages[1].role).toBe("user");
    expect(messages[1].content).toBe("Hello Mira");
    expect(messages[2].role).toBe("assistant");
    expect(messages[2].content).toBe("Hello! How is your day?");
  });

  it("builds task prompt", () => {
    const mockTask: Task = {
      id: "task-1",
      title: "Test Task",
      goal: "Generate a list of UI requirements",
      constraints: "Keep it lightweight",
      desiredOutput: "Checklist",
      supervisionMode: "unsupervised",
      authorizationScope: "text-planning-only",
      status: "draft",
      priority: "normal",
      deadline: null,
      allowedExecutorIds: ["local-planner"],
      createdBy: "user" as const,
      createdAt: "2026-06-16T12:00:00Z"
    };

    const messages = buildTaskPrompt(mockTask, mockMemories);
    expect(messages[0].role).toBe("system");
    expect(messages[1].role).toBe("user");
    expect(messages[1].content).toContain("Goal: Generate a list of UI requirements");
    expect(messages[1].content).toContain("Constraints: Keep it lightweight");
  });
});
