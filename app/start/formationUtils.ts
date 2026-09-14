// app/start/formationUtils.ts
import { PlayerState } from '@/engine/models/types';

export function normalizeFormation(players: PlayerState[]) {
  return players.map((p) => ({
    x: Number(p.x.toFixed(3)),
    y: Number(p.y.toFixed(3)),
    formationX: Number(p.formationX.toFixed(3)),
    formationY: Number(p.formationY.toFixed(3)),
    role: p.role,
    position: p.position,
    profile: p.profile,
    shirtNumber: p.shirtNumber,
  }));
}

export function formationsEqual(a: PlayerState[], b: PlayerState[]) {
  return JSON.stringify(normalizeFormation(a)) === JSON.stringify(normalizeFormation(b));
}