import type { Character } from "../../domain/types";

export function CharacterCard({ character, boundaryLabel }: { character: Character; boundaryLabel: string }) {
  return (
    <article className="character-card">
      <div className="avatar-token" style={{ backgroundColor: character.appearance.accent }}>
        {character.appearance.avatarLabel}
      </div>
      <div>
        <h3>{character.name}</h3>
        <p>{character.customRelationship}</p>
        <div className="meta-row">
          <span>{character.relationshipTemplate}</span>
          <span>{boundaryLabel}</span>
        </div>
      </div>
    </article>
  );
}
