// engine/formations/formationManager.ts
import { PlayerState } from "../models/types";
import { DEFAULT_PROFILE } from "../models/constants";

export function normalizePlayers(ps: PlayerState[]): PlayerState[] {
  return ps.map(p => ({
    ...structuredClone(p),
    profile: p.profile ?? DEFAULT_PROFILE,
  }));
}

export function createSnapshot(positions: PlayerState[]): PlayerState[] {
  return normalizePlayers(
    positions.map(p => ({
      ...structuredClone(p),
      formationX: p.x,
      formationY: p.y,
    }))
  );
}

export function resetToLoaded(currentLoaded: PlayerState[]): PlayerState[] {
  return normalizePlayers(currentLoaded);
}