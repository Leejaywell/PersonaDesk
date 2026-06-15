import type {
  AppearanceProfile,
  Character,
  PersonaDeskState,
  ProactiveBehaviorProfile,
  RoleBoundary,
  VoiceProfile
} from "./types";

export interface CharacterSettingsUpdate {
  name?: string;
  relationshipTemplate?: string;
  customRelationship?: string;
  speakingStyle?: string;
  memoryPermissionProfile?: string[];
  roleBoundaryId?: string;
  appearance?: Partial<Pick<AppearanceProfile, "backend" | "avatarLabel" | "accent">>;
  voice?: Partial<Pick<VoiceProfile, "voiceName" | "speed" | "emotionalIntensity">>;
  proactiveBehavior?: Partial<Pick<ProactiveBehaviorProfile, "frequency" | "triggers" | "doNotDisturb">>;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function sanitizeList(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function sanitizeText(value: string | undefined, fallback: string): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : fallback;
}

function sanitizeAvatarLabel(value: string | undefined, fallback: string): string {
  const trimmed = value?.trim().toUpperCase();
  return trimmed ? trimmed.slice(0, 2) : fallback;
}

function sanitizeAccent(value: string | undefined, fallback: string): string {
  return value && /^#[0-9a-fA-F]{6}$/.test(value) ? value : fallback;
}

function canUseBoundary(character: Character, boundary: RoleBoundary): boolean {
  return character.kind === "task" ? boundary.canCallExecutors : !boundary.canCallExecutors;
}

function updateCharacter(character: Character, state: PersonaDeskState, update: CharacterSettingsUpdate): Character {
  const requestedBoundary = update.roleBoundaryId ? state.roleBoundaries[update.roleBoundaryId] : undefined;
  const nextBoundaryId =
    requestedBoundary && canUseBoundary(character, requestedBoundary) ? requestedBoundary.id : character.roleBoundaryId;

  return {
    ...character,
    name: sanitizeText(update.name, character.name),
    relationshipTemplate: sanitizeText(update.relationshipTemplate, character.relationshipTemplate),
    customRelationship: sanitizeText(update.customRelationship, character.customRelationship),
    personaSummary: sanitizeText(update.customRelationship, character.personaSummary),
    speakingStyle: sanitizeText(update.speakingStyle, character.speakingStyle),
    memoryPermissionProfile: update.memoryPermissionProfile
      ? sanitizeList(update.memoryPermissionProfile)
      : character.memoryPermissionProfile,
    roleBoundaryId: nextBoundaryId,
    appearance: {
      ...character.appearance,
      backend: update.appearance?.backend ?? character.appearance.backend,
      avatarLabel: sanitizeAvatarLabel(update.appearance?.avatarLabel, character.appearance.avatarLabel),
      accent: sanitizeAccent(update.appearance?.accent, character.appearance.accent)
    },
    voice: {
      ...character.voice,
      voiceName: sanitizeText(update.voice?.voiceName, character.voice.voiceName),
      speed: update.voice?.speed === undefined ? character.voice.speed : clamp(update.voice.speed, 0.5, 2),
      emotionalIntensity:
        update.voice?.emotionalIntensity === undefined
          ? character.voice.emotionalIntensity
          : clamp(update.voice.emotionalIntensity, 0, 1)
    },
    proactiveBehavior: {
      ...character.proactiveBehavior,
      frequency: update.proactiveBehavior?.frequency ?? character.proactiveBehavior.frequency,
      triggers: update.proactiveBehavior?.triggers
        ? sanitizeList(update.proactiveBehavior.triggers)
        : character.proactiveBehavior.triggers,
      doNotDisturb: update.proactiveBehavior?.doNotDisturb ?? character.proactiveBehavior.doNotDisturb
    }
  };
}

export function updateCharacterSettings(
  state: PersonaDeskState,
  characterId: string,
  update: CharacterSettingsUpdate
): PersonaDeskState {
  if (!state.characters.some((character) => character.id === characterId)) {
    return state;
  }

  return {
    ...state,
    characters: state.characters.map((character) =>
      character.id === characterId ? updateCharacter(character, state, update) : character
    )
  };
}
