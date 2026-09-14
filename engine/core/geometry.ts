// engine/core/geometry.ts
import { PlayerState, Ball, Point } from '../models/types';
import { SIMULATION_CONFIG } from '../models/simulationConfig';

export const PITCH_WIDTH = 68; // Standard football pitch width (in meters)
export const PITCH_LENGTH = 105; // Standard football pitch length (in meters)
export const MARGIN = SIMULATION_CONFIG.geometry.pitchMargin; // Prevent players getting out of bounds
const HARD_LANE_BLOCK_DIST = SIMULATION_CONFIG.geometry.hardLaneBlockDistance;

// Calculate Euclidean distance between two points
export function dist(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

// Calculate the shortest distance from point p to the line segment defined by points a and b
export function distancePointToSegment(p: Point, a: Point, b: Point): number {
  const abx = b.x - a.x, aby = b.y - a.y;
  const apx = p.x - a.x, apy = p.y - a.y;
  const abLenSq = abx * abx + aby * aby;

  if (abLenSq === 0) return Math.hypot(apx, apy);

  const t = Math.max(0, Math.min(1, (apx * abx + apy * aby) / abLenSq));

  return Math.hypot(p.x - (a.x + t * abx), p.y - (a.y + t * aby));
}

// Get Ball side (related to attacking team) - LEFT, RIGHT, CENTER
export function getBallSide(ball: Ball) {
  if (ball.x <= PITCH_WIDTH * 0.33) return "LEFT";
  if (ball.x >= PITCH_WIDTH * 0.66) return "RIGHT";
  return "CENTER";
}

// Check if a player is on the same side of the pitch as the ball holder
export function isOnBallSide(player: PlayerState, ballHolder: PlayerState): boolean {
    if (ballHolder.x < PITCH_WIDTH / 2) {
        return player.x < PITCH_WIDTH / 2;
    }

    return player.x >= PITCH_WIDTH / 2;
}

// Checks if a pass line is blocked within blockDistance
export function isLaneSoftBlocked(a: Point, b: Point, opponents: PlayerState[], softBlockDistance: number): boolean {
  return opponents.some(opp => distancePointToSegment(opp, a, b) < softBlockDistance);
}

export function isLaneHardBlocked(from: PlayerState, to: Point, opponents: PlayerState[]): boolean {
  return opponents.some(opp => distancePointToSegment(opp, from, to) < HARD_LANE_BLOCK_DIST);
}

// Distance to nearest opponent (free space)
export function getFreeSpace(player: Point, opponents: Point[]): number {
  let freeSpace = Infinity;
  for (const opp of opponents) {
    freeSpace = Math.min(freeSpace, dist(player, opp));
  }
  return freeSpace;
}

// Find the nearest opponent to a given point
export function findNearestOpponent(point: Point, opponents: PlayerState[]): PlayerState {
  let nearestOpponent = opponents[0];
  let minDist = dist(point, nearestOpponent);

  for (let i = 1; i < opponents.length; i++) {
    const d = dist(point, opponents[i]);
    if (d < minDist) {
      minDist = d;
      nearestOpponent = opponents[i];
    }
  }
  return nearestOpponent;
}

/* ========================================== */
/* BALL + PLAYER MOVEMENT */
/* ========================================== */
// Move the ball towards a target using real meters
export function moveBallTowardsTarget(ball: Ball, target: Point, speedMetersPerTick: number) {
  const d = dist(ball, target);
  if (d === 0) return;

  const step = Math.min(speedMetersPerTick, d);
  ball.x += ((target.x - ball.x) / d) * step;
  ball.y += ((target.y - ball.y) / d) * step;
}

// Move a player toward a target point with a given speed (meters per tick)
export function movePlayerToward(player: PlayerState, target: Point, speedMetersPerTick: number) {
  const d = dist(player, target);
  if (d === 0) return;

  const step = Math.min(speedMetersPerTick, d);
  player.x += ((target.x - player.x) / d) * step;
  player.y += ((target.y - player.y) / d) * step;
}

// Clamp a value between min and max
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// Clamp a point to be within the pitch boundaries
export function clampToPitch(p: { x: number; y: number }) {
  p.x = clamp(p.x, MARGIN, PITCH_WIDTH - MARGIN);
  p.y = clamp(p.y, MARGIN, PITCH_LENGTH - MARGIN);
}