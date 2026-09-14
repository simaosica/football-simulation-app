// engine/core/random.ts

// Deterministic RNG using Mulberry32 step
export function randomFloat(state: { rngState: number }): number {
  const t = state.rngState += 0x6D2B79F5;

  let r = Math.imul(t ^ (t >>> 15), t | 1);
  r ^= r + Math.imul(r ^ (r >>> 7), r | 61);

  const result = ((r ^ (r >>> 14)) >>> 0) / 4294967296;

  return result;
}