// engine/core/pressing.ts
import { PlayerState, Ball, PressingLogic, GameState } from "../models/types";
import { dist, getBallSide } from "./geometry";
import { SIMULATION_CONFIG } from "../models/simulationConfig";

/* ========================================== */
/* HELPERS */
/* ========================================== */

function isCB(p: PlayerState) {
  return (p.position === "CB" || p.position === "LCB" || p.position === "RCB");
}

function isCM(p: PlayerState) {
  return (p.position === "CM" || p.position === "LCM" || p.position === "RCM");
}

function isST(p: PlayerState) {
  return (p.position === "ST" || p.position === "LST" || p.position === "RST");
}

function getBallCarrier(players: PlayerState[], ball: Ball): PlayerState | null {
  if (ball.holderIndex === null) return null;
  return players[ball.holderIndex] ?? null;
}

function clampY(target: { x: number; y: number }, maxY: number) {
  return { x: target.x, y: Math.min(target.y, maxY) };
}

// Ball side is from ATTACKING team perspective
function isNearSideForDefender(ball: Ball, defender: PlayerState) {
  const side = getBallSide(ball);

  if (side === "LEFT") {
    return (defender.position === "RB" || defender.position === "RWB" || defender.position === "RCM" || defender.position === "RM");
  }

  if (side === "RIGHT") {
    return (defender.position === "LB" || defender.position === "LWB" || defender.position === "LCM" || defender.position === "LM");
  }

  return false;
}

// Calculate the pressing approach target for a presser, with a side offset based on position and ball carrier
function getPressApproachTarget(presser: PlayerState, ball: Ball, ballCarrier: PlayerState | null): { x: number; y: number } {
  const target = ballCarrier ?? ball;

  const dx = target.x - presser.x;
  const dy = target.y - presser.y;
  const len = Math.hypot(dx, dy) || 1;

  let sideOffset = 0;
  const offsets = SIMULATION_CONFIG.pressing.sideOffsets;

  if (presser.position === "LST") sideOffset = offsets.LST;
  else if (presser.position === "RST") sideOffset = offsets.RST;
  else if (presser.position === "ST") sideOffset = 0;

  else if (presser.position === "LM") sideOffset = offsets.LM;
  else if (presser.position === "RM") sideOffset = offsets.RM;

  else if (presser.position === "LCM") sideOffset = offsets.LCM;
  else if (presser.position === "RCM") sideOffset = offsets.RCM;
  else if (presser.position === "CM") sideOffset = 0;

  else if (presser.position === "LB") sideOffset = offsets.LB;
  else if (presser.position === "LWB") sideOffset = offsets.LWB;
  else if (presser.position === "RB") sideOffset = offsets.RB;
  else if (presser.position === "RWB") sideOffset = offsets.RWB;

  return {
    x: target.x - (dx / len) + (-dy / len) * sideOffset,
    y: target.y - (dy / len) + (dx / len) * sideOffset,
  };
}

function getRolePenalty(opp: PlayerState) {
  if (isST(opp)) return SIMULATION_CONFIG.pressing.rolePenalty.ST;
  if (isCM(opp)) return SIMULATION_CONFIG.pressing.rolePenalty.CM;
  if (isCB(opp)) return SIMULATION_CONFIG.pressing.rolePenalty.CB;
  return SIMULATION_CONFIG.pressing.rolePenalty.DEFAULT;
}

// Get DEFENSIVE LINE Y position based on ball Y
function getDefensiveLineY(ballY: number) {
  return Math.min(ballY + SIMULATION_CONFIG.pressing.defensiveLineBallOffset, SIMULATION_CONFIG.pressing.defensiveLineMaxY);
}

/* ========================================== */
/* ATTACKING TEAM */
/* ========================================== */

// Get the ATTACKING TEAM center back farthest from the ball
export function getAttTeamOppositeCB(ball: Ball, players: PlayerState[]): PlayerState | null {
  let best: PlayerState | null = null;
  let maxDist = -Infinity;

  players.forEach((p) => {
    if (!["LCB", "CB", "RCB"].includes(p.position)) return;
    const d = dist(ball, p);
    if (d > maxDist) {
      maxDist = d;
      best = p;
    }
  });

  return best;
}

// Get the ATTACKING TEAM CDMs center position
export function getCDMsCenter(players: PlayerState[]) {
  const cdms = players.filter((p) => ["CDM", "LCDM", "RCDM"].includes(p.position));
  if (cdms.length === 0) return null;
  const avgX = cdms.reduce((sum, p) => sum + p.x, 0) / cdms.length;
  const avgY = cdms.reduce((sum, p) => sum + p.y, 0) / cdms.length;
  return { x: avgX, y: avgY };
}

/* ========================================== */
/* DEFENDING TEAM */
/* ========================================== */

// Get the DEFENDING TEAM striker screening position
export function getStrikerScreeningPosition(
  oppositeCB: PlayerState,
  cdmsCenter: { x: number; y: number }
) {
  return {
    x: 0.4 * oppositeCB.x + 0.6 * cdmsCenter.x,
    y: 0.4 * oppositeCB.y + 0.6 * cdmsCenter.y,
  };
}

function getPressScore(opp: PlayerState, idx: number, players: PlayerState[], ball: Ball, previousPresserIndex: number | null) {
  if (opp.role === "GK") return Infinity;

  const d = dist(opp, ball);
  let score = d + getRolePenalty(opp);

  // Discourage pressing from behind
  if (ball.y < opp.y) {
    score += (opp.y - ball.y) * SIMULATION_CONFIG.pressing.pressingFromBehindScale;
  }

  // CBs only step if the attacking ball carrier is a striker
  if (isCB(opp)) {
    const ballCarrier = getBallCarrier(players, ball);
    if (!ballCarrier || !isST(ballCarrier)) return Infinity;
  }

  // Persistence / hysteresis
  if (previousPresserIndex === idx) score -= 1;

  return score;
}

function choosePresser(opponents: PlayerState[], players: PlayerState[], ball: Ball, previousPresserIndex: number | null): number | null {
  let bestIdx: number | null = null;
  let bestScore = Infinity;

  opponents.forEach((opp, idx) => {
    const score = getPressScore(opp, idx, players, ball, previousPresserIndex);
    if (score < bestScore) {
      bestScore = score;
      bestIdx = idx;
    }
  });

  if (previousPresserIndex !== null && opponents[previousPresserIndex]) {
    const prevScore = getPressScore(opponents[previousPresserIndex], previousPresserIndex, players, ball, previousPresserIndex);

    const SWITCH_MARGIN = SIMULATION_CONFIG.pressing.presserSwitchMargin;
    if (prevScore <= bestScore + SWITCH_MARGIN) return previousPresserIndex;
  }

  return bestIdx;
}

function chooseScreenPlayer(opponents: PlayerState[], players: PlayerState[], ball: Ball, presserIndex: number | null): number | null {
  const oppositeCB = getAttTeamOppositeCB(ball, players);
  const cdmsCenter = getCDMsCenter(players);

  if (!oppositeCB || !cdmsCenter) return null;

  const screenTarget = getStrikerScreeningPosition(oppositeCB, cdmsCenter);

  let bestIdx: number | null = null;
  let bestDist = Infinity;

  opponents.forEach((opp, idx) => {
    if (idx === presserIndex) return;
    if (!isST(opp) && !isCM(opp)) return;

    const d = dist(opp, screenTarget);
    if (d < bestDist) {
      bestDist = d;
      bestIdx = idx;
    }
  });

  return bestIdx;
}

// Function to compute pressing logic
export function computePressingLogic(opponents: PlayerState[], players: PlayerState[], ball: Ball, previousPresserIndex: number | null = null): PressingLogic {
  const presserIndex = choosePresser(opponents, players, ball, previousPresserIndex);
  const screenIndex = chooseScreenPlayer(opponents, players, ball, presserIndex);

  return {
    presserIndex,
    screenIndex,
  };
}

/* ========================================== */
/* TARGETS */
/* ========================================== */

// Get ST/RST/LST target position
export function getSTtarget(stIndex: number, gamestate: GameState, pressing: PressingLogic): { x: number; y: number } {
  const st = gamestate.opponentPlayers[stIndex];
  const defLineY = getDefensiveLineY(gamestate.ball.y);
  const ballCarrier = getBallCarrier(gamestate.mainPlayers, gamestate.ball);

  // ST is the presser
  if (pressing.presserIndex === stIndex) {
    return clampY(getPressApproachTarget(st, gamestate.ball, ballCarrier), defLineY);
  }

  // Explicit screen role
  if (pressing.screenIndex === stIndex) {
    const attTeamOppositeCB = getAttTeamOppositeCB(gamestate.ball, gamestate.mainPlayers);
    const cdmsCenter = getCDMsCenter(gamestate.mainPlayers);
    if (attTeamOppositeCB && cdmsCenter) {
      return clampY(getStrikerScreeningPosition(attTeamOppositeCB, cdmsCenter), defLineY);
    }
  }

  // Another striker is the presser
  if (pressing.presserIndex !== null) {
    const presser = gamestate.opponentPlayers[pressing.presserIndex];
    const isOtherStrikerPresser = isST(presser) && pressing.presserIndex !== stIndex;

    if (isOtherStrikerPresser) {
      const attTeamOppositeCB = getAttTeamOppositeCB(gamestate.ball, gamestate.mainPlayers);
      const cdmsCenter = getCDMsCenter(gamestate.mainPlayers);
      if (attTeamOppositeCB && cdmsCenter) {
        return clampY(getStrikerScreeningPosition(attTeamOppositeCB, cdmsCenter), defLineY);
      }
    }
  }

  const targetY = 0.4 * st.formationY + 0.6 * gamestate.ball.y;

  return {
    x: 0.8 * st.formationX + 0.2 * gamestate.ball.x,
    y: Math.min(targetY, defLineY),
  };
}

// Get RM/LM target position
export function getWMtarget(wmIndex: number, gamestate: GameState, pressing: PressingLogic): { x: number; y: number } {
  const wm = gamestate.opponentPlayers[wmIndex];
  const defLineY = getDefensiveLineY(gamestate.ball.y);
  const ballCarrier = getBallCarrier(gamestate.mainPlayers, gamestate.ball);

  // WM is the presser
  if (pressing.presserIndex === wmIndex) {
    return clampY(getPressApproachTarget(wm, gamestate.ball, ballCarrier), 0.88 * defLineY);
  }

  const nearSide = isNearSideForDefender(gamestate.ball, wm);

  const targetY = nearSide
    ? 0.55 * wm.formationY + 0.45 * gamestate.ball.y
    : 0.7 * wm.formationY + 0.3 * gamestate.ball.y;

  const targetX = nearSide
    ? 0.82 * wm.formationX + 0.18 * gamestate.ball.x
    : 0.9 * wm.formationX + 0.1 * gamestate.ball.x;

  return {
    x: targetX,
    y: Math.min(targetY, 0.9 * defLineY),
  };
}

// Get CM/RCM/LCM target position
export function getCMtarget(cmIndex: number, gamestate: GameState, pressing: PressingLogic): { x: number; y: number } {
  const cm = gamestate.opponentPlayers[cmIndex];
  const defLineY = getDefensiveLineY(gamestate.ball.y);
  const ballCarrier = getBallCarrier(gamestate.mainPlayers, gamestate.ball);

  // CM is the presser
  if (pressing.presserIndex === cmIndex) {
    return clampY(getPressApproachTarget(cm, gamestate.ball, ballCarrier), 0.8 * defLineY);
  }

  const nearSide = isNearSideForDefender(gamestate.ball, cm);

  if (nearSide) {
    const targetY = 0.7 * cm.formationY + 0.3 * gamestate.ball.y;
    return {
      x: 0.88 * cm.formationX + 0.12 * gamestate.ball.x,
      y: Math.min(targetY, 0.85 * defLineY),
    };
  }

  const targetY = 0.75 * cm.formationY + 0.25 * gamestate.ball.y;

  return {
    x: 0.9 * cm.formationX + 0.1 * gamestate.ball.x,
    y: Math.min(targetY, 0.8 * defLineY),
  };
}

// Get RB/RWB/LB/LWB target position
export function getFBtarget(fbIndex: number, gamestate: GameState, pressing: PressingLogic): { x: number; y: number } {
  const fb = gamestate.opponentPlayers[fbIndex];
  const defLineY = getDefensiveLineY(gamestate.ball.y);
  const ballCarrier = getBallCarrier(gamestate.mainPlayers, gamestate.ball);

  let target = {
    x: 0.85 * fb.formationX + 0.15 * gamestate.ball.x,
    y: Math.min(0.75 * fb.formationY + 0.25 * gamestate.ball.y, 0.68 * defLineY),
  };

  // FB is the presser
  if (pressing.presserIndex === fbIndex) {
    return clampY(getPressApproachTarget(fb, gamestate.ball, ballCarrier), 0.72 * defLineY);
  }

  // Find corresponding winger to mark
  const wingerToMark = gamestate.mainPlayers.find((p) =>
    fb.position === "RB" || fb.position === "RWB"
      ? p.position === "LW" || p.position === "LM"
      : p.position === "RW" || p.position === "RM"
  );

  if (wingerToMark) {
    const nearSide = isNearSideForDefender(gamestate.ball, fb);

    if (nearSide) {
      const rawY = 0.35 * gamestate.ball.y + 0.65 * wingerToMark.y;
      target = {
        x: 0.72 * (0.88 * fb.formationX + 0.12 * gamestate.ball.x) + 0.28 * wingerToMark.x,
        y: Math.min(rawY, 0.7 * defLineY),
      };
    }

    const buffer = 2;

    // FB must not pass the winger in y-level when marking + always mark from inside
    if (target.y > wingerToMark.y) target.y = wingerToMark.y - buffer;
    if ((target.x < wingerToMark.x) && (fb.position === "RB" || fb.position === "RWB")) target.x = wingerToMark.x + buffer;
    if ((target.x > wingerToMark.x) && (fb.position === "LB" || fb.position === "LWB")) target.x = wingerToMark.x - buffer;
  }

  target.y = Math.min(target.y, defLineY);
  return target;
}

// Get CB/RCB/LCB target position
export function getCBtarget(cbIndex: number, gamestate: GameState, pressing: PressingLogic): { x: number; y: number } {
  const cb = gamestate.opponentPlayers[cbIndex];
  const defLineY = getDefensiveLineY(gamestate.ball.y);
  const ballCarrier = getBallCarrier(gamestate.mainPlayers, gamestate.ball);

  // CB is active presser
  if (pressing.presserIndex === cbIndex) {
    return clampY(getPressApproachTarget(cb, gamestate.ball, ballCarrier), 0.65 * defLineY);
  }

  const oppSTs = gamestate.mainPlayers.filter((p) => isST(p));
  const ballSide = getBallSide(gamestate.ball);

  const baseY = 0.72 * cb.formationY + 0.28 * gamestate.ball.y;
  let baseTarget: { x: number; y: number };

  if ((ballSide === "LEFT" && cb.position === "LCB") || (ballSide === "RIGHT" && cb.position === "RCB")) {
    baseTarget = {
      x: 0.87 * cb.formationX + 0.13 * gamestate.ball.x,
      y: Math.min(baseY, 0.63 * defLineY),
    };
  } else {
    baseTarget = {
      x: 0.93 * cb.formationX + 0.07 * gamestate.ball.x,
      y: Math.min(baseY, 0.63 * defLineY),
    };
  }

  let markInfluence: { x: number; y: number } | null = null;

  if (oppSTs.length === 1) {
    const striker = oppSTs[0];
    const allCBs = gamestate.opponentPlayers.filter((p) => isCB(p));

    if (allCBs.length >= 2) {
      const closestCB = [...allCBs]
        .map((def) => ({ cb: def, d: dist(def, striker) }))
        .sort((a, b) => a.d - b.d)[0].cb;

      // only the closest CB shades toward striker
      if (closestCB === cb && striker.y < cb.formationY + 12) {
        markInfluence = { x: striker.x, y: striker.y - 3 };
      }
    }
  }

  if (markInfluence) {
    const MARK_WEIGHT = 0.22;
    return {
      x: (1 - MARK_WEIGHT) * baseTarget.x + MARK_WEIGHT * markInfluence.x,
      y: Math.min(
        (1 - MARK_WEIGHT) * baseTarget.y + MARK_WEIGHT * markInfluence.y,
        0.63 * defLineY
      ),
    };
  }

  return baseTarget;
}