// engine/core/passing.ts
import { GameState, PlayerProfile, PassOption, PlayerState, TacticalProfile } from '../models/types';
import { dist, distancePointToSegment, isLaneHardBlocked } from "./geometry";
import { randomFloat } from "./random";
import { SIMULATION_CONFIG } from "../models/simulationConfig";
import { DEBUG_CONFIG } from "../models/debugConfig";

const ABSOLUTE_MAX_PASS_DISTANCE = SIMULATION_CONFIG.passing.absoluteMaxPassDistance;

// Get risk radius based on risk level
function getRiskRadius(risk: TacticalProfile["risk"]) {
  return SIMULATION_CONFIG.passing.riskRadius[risk];
}

// Get risk multiplier based on risk level
function getRiskMultiplier(risk: TacticalProfile["risk"]) {
  return SIMULATION_CONFIG.passing.riskMultiplier[risk];
}

// Get pass temperature based on tempo setting
function getPassTemperature(tempo: TacticalProfile["tempo"]) {
  return SIMULATION_CONFIG.passing.passTemperature[tempo];
}

// Get tempo pressure rate based on tempo setting
export function getTempoPressureRate(tempo: TacticalProfile["tempo"]) {
  return SIMULATION_CONFIG.passing.tempoPressureRate[tempo];
}

// Get passing lane danger based on opponent proximity to the passing lane (0-1 scale per opponent, 0-N opponents)
function getLaneDanger(passer: PlayerState, receiver: PlayerState, opponents: PlayerState[], riskRadius: number): number {
  let danger = 0;

  opponents.forEach(opp => {
    const d = distancePointToSegment(opp, passer, receiver);
    if (d < riskRadius) danger += (riskRadius - d) / riskRadius;
  });

  return danger;
}


// Get pressure on the receiver based on nearest opponent distance (0-1 scale)
export function getReceiverPressure(receiver: PlayerState, opponents: PlayerState[], riskRadius: number): number {
  let minDist = Infinity;

  opponents.forEach(opp => {
    const d = dist(receiver, opp);
    if (d < minDist) minDist = d;
  });

  if (minDist > riskRadius) return 0; // no pressure

  return ((riskRadius - minDist) / riskRadius);
}

// Get all possible pass options
export function getPassOptions(state: GameState, tacticalProfile: TacticalProfile): PassOption[] {
  const {ball, mainPlayers, opponentPlayers} = state;

  if (ball.holderIndex === null) return [];

  const passer = mainPlayers[ball.holderIndex];
  const riskRadius = getRiskRadius(tacticalProfile.risk)

  return mainPlayers.map((p, idx) => {
      if (idx === ball.holderIndex) return null;

      const distance = dist(passer, p);
      if (distance > ABSOLUTE_MAX_PASS_DISTANCE) return null;
      if (isLaneHardBlocked(passer, p, opponentPlayers)) return null;

      const laneDanger = getLaneDanger(passer, p, opponentPlayers, riskRadius);
      const receiverPressure = getReceiverPressure(p, opponentPlayers, riskRadius);
      const forwardProgress = passer.y - p.y; // positive if pass moves forward
      return {receiverIndex: idx, distance, laneDanger, receiverPressure, forwardProgress};
    }).filter(Boolean) as PassOption[];
}

function computeSideBiasScore(passOption: PassOption, state: GameState, tactics: TacticalProfile, playerProfile: PlayerProfile): number | null {
  const sideBiasWeight = playerProfile.passingWeights.sideBias ?? 0;
  if (sideBiasWeight === 0) return 0;

  const isFirstPass = !state.buildUpStarted && state.ball.holderIndex === 0 && state.ball.target === null;
  if (!isFirstPass) return 0;

  const bias = tactics.buildUpSide;
  const receiver = state.mainPlayers[passOption.receiverIndex];

  let side = 0;
  if (receiver.x < 34) side = -1;
  else if (receiver.x > 34) side = 1;

  // HARD FORCE (extreme slider)
  if (Math.abs(bias) === 1 && side !== bias) return null;

  // SOFT bias
  if (bias !== 0 && side !== 0) {
    return (-(side * bias) * SIMULATION_CONFIG.passing.sideBiasSoftPenalty);
  }

  return 0;
}

// Give a score to a pass option (lower is better)
export function passScore(passOption: PassOption, state: GameState, tactics: TacticalProfile, playerProfile: PlayerProfile): number {
  const riskMultiplier = getRiskMultiplier(tactics.risk);

  const distanceScore = passOption.distance * 3;
  const forwardScore = passOption.forwardProgress > 0 ? -passOption.forwardProgress * (1/riskMultiplier) : 0;
  const laneDangerScore = passOption.laneDanger * riskMultiplier * SIMULATION_CONFIG.passing.laneDangerWeightScale;
  const receiverPressureScore = passOption.receiverPressure * riskMultiplier * SIMULATION_CONFIG.passing.receiverPressureWeightScale;
  const sideBiasScore = computeSideBiasScore(passOption, state, tactics, playerProfile);

  // If side bias is not satisfied, discard this pass option by giving it an infinite score
  if (sideBiasScore === null) return Infinity;

  const weights = playerProfile.passingWeights;
  const sideBiasWeight = weights.sideBias ?? 0;

  const score =
    distanceScore * weights.distance +
    forwardScore * weights.forwardProgress +
    laneDangerScore * weights.laneSafety +
    receiverPressureScore * weights.receiverPressurePenalty +
    sideBiasScore * sideBiasWeight;

  return score;
}

// Pick a pass option based on weighted random selection
function pickedPass(weightedOptions: (PassOption & {weight: number})[], state: GameState): PassOption {
  const totalWeight = weightedOptions.reduce((sum, opt) => sum + opt.weight, 0);
  let rand = randomFloat(state) * totalWeight;

  for (const option of weightedOptions) {
    rand -= option.weight;
    if (rand <= 0) return option;
  }

  return weightedOptions[weightedOptions.length - 1];
}

// Choose the next pass option
export function chooseNextPass(state: GameState, tacticalProfile: TacticalProfile): number | null {
  const options = getPassOptions(state, tacticalProfile);
  if (!options.length) return null;

  const passer = state.mainPlayers[state.ball.holderIndex!];
  const profile = passer.profile;

  const scored = options.map(opt => ({...opt, score: passScore(opt, state, tacticalProfile, profile)})).filter(opt => Number.isFinite(opt.score));
  if (!scored.length) return null;

  scored.sort((a, b) => a.score - b.score);

  const bestScore = scored[0].score;
  const temperature = getPassTemperature(tacticalProfile.tempo);

  const weighted = scored.map(p => {
    const gap = p.score - bestScore;
    const weight = Math.exp(-gap / temperature);
    return {...p, weight};
  });

  // log available passes for debugging
  if (DEBUG_CONFIG.logPassChoices) {
    const totalWeight = weighted.reduce((sum, opt) => sum + opt.weight, 0);
  
    console.log("--- PASS OPTIONS ---");
    weighted.slice(0, 3).forEach(opt => {
      const percentage = (opt.weight / totalWeight) * 100;
      console.log(
        `Pass To Player ${opt.receiverIndex}: Score=${opt.score.toFixed(1)} Probability=${percentage.toFixed(1)}%`
      );
    });
  }

  return pickedPass(weighted, state).receiverIndex;
}