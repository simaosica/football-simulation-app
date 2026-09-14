// engine/core/buildUpMovement.ts
import {Ball, PlayerState, Point, PlayerProfile} from "../models/types";
import {getFreeSpace, isLaneSoftBlocked, isLaneHardBlocked, dist, isOnBallSide} from "./geometry";
import { SIMULATION_CONFIG } from "../models/simulationConfig";

const PASS_BLOCK_DIST = SIMULATION_CONFIG.buildUpMovement.passBlockDistance;
const SEARCH_RADIUS = SIMULATION_CONFIG.buildUpMovement.searchRadius;
const MARGIN = SIMULATION_CONFIG.buildUpMovement.formationMargin;
const CLOSE_ENOUGH_DIST = SIMULATION_CONFIG.buildUpMovement.closeEnoughDistance;
const RADII = [SEARCH_RADIUS * 0.5, SEARCH_RADIUS];

// If outside allowed zone, forbid movement by returning current position
export function clampToRoleZone(pos: Point, player: PlayerState): Point {
    if (roleRestrictions(pos, player)) return pos;
    return { x: player.x, y: player.y };
}

// Minimum free space needed based on player role
function getMinimumFreeSpacePerRole(player: PlayerState): number {
    switch (player.role) {
        case "GK": case "DEF":
            return SIMULATION_CONFIG.buildUpMovement.roleFreeSpace.GK_DEF;
        case "MID":
            return SIMULATION_CONFIG.buildUpMovement.roleFreeSpace.MID;
        case "FWD":
            return SIMULATION_CONFIG.buildUpMovement.roleFreeSpace.FWD;
        default:
            return SIMULATION_CONFIG.buildUpMovement.roleFreeSpace.MID;
    }
}

function shouldSupport(player: PlayerState, ballHolder: PlayerState): boolean {
    if (player === ballHolder) return false;

    const onBallSide = isOnBallSide(player, ballHolder);
    const closeEnough = dist(player, ballHolder) <= CLOSE_ENOUGH_DIST;

    return (onBallSide || closeEnough);
}

// Reward forward movement
function forwardImprovementBonus(test: Point, self: PlayerState): number {
    // Only reward movement ahead of current position
    if (test.y >= self.y) return 0;
    return (self.y - test.y);
}

// Get offside reference line Y coordinate based on opponents' positions
function getOffsideReferenceLine(opponents: PlayerState[]): number {
    const ys = opponents.map(o => o.y).sort((a, b) => a - b);
    return ys[1];
}

// Get the effective offside line Y coordinate considering the ball holder's position
function getEffectiveOffsideLineY(ballHolder: PlayerState, opponents: PlayerState[]): number {
    return Math.min(ballHolder.y, getOffsideReferenceLine(opponents));
}

function isPointOffside(test: Point, ballHolder: PlayerState, opponents: PlayerState[]): boolean {
    const opponentHalfLineY = SIMULATION_CONFIG.buildUpMovement.offside.opponentHalfLineY;
    if (test.y > opponentHalfLineY) return false;

    const lineY = getEffectiveOffsideLineY(ballHolder, opponents);
    return test.y < lineY;
}

function getOffsidePenalty(test: Point, ballHolder: PlayerState, opponents: PlayerState[]): number {
    const opponentHalfLineY = SIMULATION_CONFIG.buildUpMovement.offside.opponentHalfLineY;
    if (test.y > opponentHalfLineY) return 0;

    const lineY = getEffectiveOffsideLineY(ballHolder, opponents);
    const excess = lineY - test.y;

    if (excess <= 0) return 0;

    return excess * excess * SIMULATION_CONFIG.buildUpMovement.offsidePenaltyScale;
}


function teammateSpacingPenalty(test: Point, self: PlayerState, teammates: PlayerState[]): number {
    let penalty = 0;
  
    for (const mate of teammates) {
        if (mate === self) continue;
  
        const d = dist(test, mate);

        // quadratic penalty when too close
        const spacingDistance = SIMULATION_CONFIG.buildUpMovement.teammateSpacingDistance;
        if (d < spacingDistance) penalty += (spacingDistance - d) * (spacingDistance - d);
    }
    return penalty;
}

// Pitch dimensions: 0 <= x <= 68, 0 <= y <= 105
function roleRestrictions(coords: Point, player: PlayerState): boolean {
    switch (player.position) {
        case "GK":
            const { goalkeeperMinX, goalkeeperMaxX } = SIMULATION_CONFIG.buildUpMovement.roleRestrictions;
            return goalkeeperMinX <= coords.x && coords.x <= goalkeeperMaxX;
        default:
            return true;
    }
}

function rangePenalty(value: number, minAllowed: number | null, maxAllowed: number | null): number {
    let penalty = 0;

    if (minAllowed !== null && value < minAllowed) {
        const d = minAllowed - value;
        penalty += d * d;
    }

    if (maxAllowed !== null && value > maxAllowed) {
        const d = value - maxAllowed;
        penalty += d * d;
    }

    return penalty;
}

function positionRangePenalty(test: Point, forwardLimit: number | null, backwardsLimit: number | null, leftLimit: number | null, rightLimit: number | null): number {
    const verticalPenalty = rangePenalty(test.y, forwardLimit, backwardsLimit);
    const horizontalPenalty = rangePenalty(test.x, leftLimit, rightLimit);

    return verticalPenalty + horizontalPenalty;
}

function getPlayersByPositions(teammates: PlayerState[], positions: string[]): PlayerState[] {
    return teammates.filter(p => positions.includes(p.position));
}

function getMinY(players: PlayerState[]): number | null {
    return players.length > 0 ? (Math.min(...players.map(p => p.y)) - MARGIN) : null;
}

function getMaxY(players: PlayerState[]): number | null {
    return players.length > 0 ? (Math.max(...players.map(p => p.y)) + MARGIN) : null;
}

function getLeftLimit(players: PlayerState[]): number | null {
    return players.length > 0 ? Math.max(...players.map(p => p.x)) + MARGIN : null;
}

function getRightLimit(players: PlayerState[]): number | null {
    return players.length > 0 ? Math.min(...players.map(p => p.x)) - MARGIN : null;
}

function formationPenalty(test: Point, player: PlayerState, teammates: PlayerState[]): number {
    let backwardsLimit: number | null = null; // should not drop below
    let forwardLimit: number | null = null; // should not go above
    let leftLimit: number | null = null; // should not go left of
    let rightLimit: number | null = null; // should not go right of

    switch (player.position) {
        case "GK":
            const forwardReference = teammates.filter(p => p.role === "DEF");
            forwardLimit = getMaxY(forwardReference);
            break;

        case "CB": case "LCB": case "RCB": {
            const backReference = getPlayersByPositions(teammates, ["GK"])[0];
            const forwardReference = teammates.filter(p => p.role === "MID");

            backwardsLimit = getMinY([backReference]);
            forwardLimit = getMaxY(forwardReference);

            if (player.position === "LCB"){
                const leftReference = getPlayersByPositions(teammates, ["LB", "LWB", "LM"]);
                const rightReference = backReference;

                leftLimit = getLeftLimit(leftReference);
                rightLimit = getRightLimit([rightReference]);
            }
            else if (player.position === "RCB"){
                const leftReference = backReference;
                const rightReference = getPlayersByPositions(teammates, ["RB", "RWB", "RM"]);

                leftLimit = getLeftLimit([leftReference]);
                rightLimit = getRightLimit(rightReference);
            }
            else {
                const leftReference = getPlayersByPositions(teammates, ["LCB", "LB", "LWB"]);
                const rightReference = getPlayersByPositions(teammates, ["RCB", "RB", "RWB"]);

                leftLimit = getLeftLimit(leftReference);
                rightLimit = getRightLimit(rightReference);
            }
            break;
        }

        case "CDM": case "LCDM": case "RCDM": {
            const backReference = teammates.filter(p => p.role === "DEF");
            const forwardReference = getPlayersByPositions(teammates, ["CM", "LCM", "RCM", "CAM", "LCAM", "RCAM"]);
            //const forwardReference = teammates.filter(p => p.role === "FWD");

            backwardsLimit = getMinY(backReference);
            forwardLimit = getMaxY(forwardReference);

            if(player.position === "LCDM"){
                const leftReference = getPlayersByPositions(teammates, ["LB", "LWB", "LM"]);
                const rightReference = getPlayersByPositions(teammates, ["GK"])[0];

                leftLimit = getLeftLimit(leftReference);
                rightLimit = getRightLimit([rightReference]);
            }
            else if (player.position === "RCDM"){
                const leftReference = getPlayersByPositions(teammates, ["GK"])[0];
                const rightReference = getPlayersByPositions(teammates, ["RB", "RWB", "RM"]);

                leftLimit = getLeftLimit([leftReference]);
                rightLimit = getRightLimit(rightReference);
            }
            else {
                const leftReference = getPlayersByPositions(teammates, ["LB", "LWB", "LM"]);
                const rightReference = getPlayersByPositions(teammates, ["RB", "RWB", "RM"]);

                leftLimit = getLeftLimit(leftReference);
                rightLimit = getRightLimit(rightReference);
            }
            break;
        }

        case "CM": case "LCM": case "RCM": case "CAM": case "LCAM": case "RCAM": {
            const backReference = getPlayersByPositions(teammates, ["CDM", "LCDM", "RCDM"]);
            const forwardReference = teammates.filter(p => p.role === "FWD");

            backwardsLimit = getMinY(backReference);
            forwardLimit = getMaxY(forwardReference);

            if(player.position === "LCM" || player.position === "LCAM"){
                const leftReference = getPlayersByPositions(teammates, ["LB", "LWB", "LM"]);
                const rightReference = getPlayersByPositions(teammates, ["GK"])[0];

                leftLimit = getLeftLimit(leftReference);
                rightLimit = getRightLimit([rightReference]);
            }
            else if (player.position === "RCM" || player.position === "RCAM"){
                const leftReference = getPlayersByPositions(teammates, ["GK"])[0];
                const rightReference = getPlayersByPositions(teammates, ["RB", "RWB", "RM"]);

                leftLimit = getLeftLimit([leftReference]);
                rightLimit = getRightLimit(rightReference);
            }
            else {
                const leftReference = getPlayersByPositions(teammates, ["LB", "LWB", "LM"]);
                const rightReference = getPlayersByPositions(teammates, ["RB", "RWB", "RM"]);

                leftLimit = getLeftLimit(leftReference);
                rightLimit = getRightLimit(rightReference);
            }
            break;
        }

        case "LB": case "LWB": case "RB": case "RWB": {
            const backReference = getPlayersByPositions(teammates, ["CB", "LCB", "RCB"]);
            const wideMids = getPlayersByPositions(teammates, ["LM", "RM"]);
            const forwards = teammates.filter(p => p.role === "FWD");  
            const forwardReference = [...wideMids, ...forwards];

            backwardsLimit = getMinY(backReference);
            forwardLimit = getMaxY(forwardReference);

            if (player.position === "LB" || player.position === "LWB"){
                const rightReference = getPlayersByPositions(teammates, ["CB", "LCB"]);

                rightLimit = getRightLimit(rightReference);
            }
            else {
                const leftReference = getPlayersByPositions(teammates, ["CB", "RCB"]);

                leftLimit = getLeftLimit(leftReference);
            }
            break;
        }

        case "LM": case "RM": case "LW": case "RW": {
            const fullBacks = getPlayersByPositions(teammates, ["LB", "LWB", "RB", "RWB"]);
            const holdingMids = getPlayersByPositions(teammates, ["CDM", "LCDM", "RCDM"]);
            const backReference = [...fullBacks, ...holdingMids];
            const forwardReference = getPlayersByPositions(teammates, ["ST", "LST", "RST"]);

            backwardsLimit = getMinY(backReference);
            forwardLimit = getMaxY(forwardReference);

            if (player.position === "LM" || player.position === "LW"){
                const rightReference = getPlayersByPositions(teammates, ["LCM", "LCDM", "CM", "CDM", "LCAM", "CAM"]);

                rightLimit = getRightLimit(rightReference);
            }
            else {
                const leftReference = getPlayersByPositions(teammates, ["RCM", "RCDM", "CM", "CDM", "RCAM", "CAM"]);

                leftLimit = getLeftLimit(leftReference);
            }
            break;
        }

        case "ST": case "LST": case "RST": {
            const backReference = teammates.filter(p => p.role === "MID");

            backwardsLimit = getMinY(backReference);

            if (player.position === "LST"){
                const leftReference = getPlayersByPositions(teammates, ["LM", "LW", "LWB", "LB"]);
                const rightReference = getPlayersByPositions(teammates, ["RST"]);

                leftLimit = getLeftLimit(leftReference);
                rightLimit = getRightLimit(rightReference);
            }
            else if (player.position === "RST"){
                const leftReference = getPlayersByPositions(teammates, ["LST"]);
                const rightReference = getPlayersByPositions(teammates, ["RM", "RW", "RWB", "RB"]);

                leftLimit = getLeftLimit(leftReference);
                rightLimit = getRightLimit(rightReference);
            }
            else {
                const leftReference = getPlayersByPositions(teammates, ["LM", "LW", "LWB", "LB", "LST", "LCAM"]);
                const rightReference = getPlayersByPositions(teammates, ["RM", "RW", "RWB", "RB", "RST", "RCAM"]);

                leftLimit = getLeftLimit(leftReference);
                rightLimit = getRightLimit(rightReference);
            }
            break;
        }

        default:
            return 0;
    }

    return positionRangePenalty(test, forwardLimit, backwardsLimit, leftLimit, rightLimit);
}


// Lower score = better position
function scorePosition(test: Point, self: PlayerState, ballHolder: PlayerState, teammates: PlayerState[], opponents: PlayerState[], movementWeights: PlayerProfile["movementWeights"]): number {
    const isBallHolder = (self === ballHolder);

    const spacingPenalty = teammateSpacingPenalty(test, self, teammates);
    const positionPenalty = formationPenalty(test, self, teammates);

    const forwardBonus = forwardImprovementBonus(test, self);
    const freeSpace = getFreeSpace(test, opponents);

    if (isBallHolder) {
        return (
            movementWeights.spacingPenalty * spacingPenalty * SIMULATION_CONFIG.buildUpMovement.scoreWeights.ballHolderSpacingPenaltyScale +
            movementWeights.shapePenalty * positionPenalty * SIMULATION_CONFIG.buildUpMovement.scoreWeights.shapePenaltyScale -
            movementWeights.forwardProgressReward * forwardBonus -
            movementWeights.freeSpaceReward * Math.min(freeSpace, SIMULATION_CONFIG.buildUpMovement.ballHolderFreeSpaceCap)
        );
    }

    if (isLaneHardBlocked(ballHolder, test, opponents)) return Infinity;

    const softBlockedPenalty = isLaneSoftBlocked(ballHolder, test, opponents, PASS_BLOCK_DIST)
        ? SIMULATION_CONFIG.buildUpMovement.softBlockedLanePenalty
        : 0;
    const offsidePenalty = getOffsidePenalty(test, ballHolder, opponents);

    const MIN_FREE_SPACE = getMinimumFreeSpacePerRole(self);
    const GOOD_ENOUGH_FREE_SPACE = MIN_FREE_SPACE * 1.5;
    const space = Math.min(freeSpace, GOOD_ENOUGH_FREE_SPACE);

    return (
        softBlockedPenalty + offsidePenalty +
        movementWeights.spacingPenalty * spacingPenalty * SIMULATION_CONFIG.buildUpMovement.scoreWeights.supportSpacingPenaltyScale +
        movementWeights.shapePenalty * positionPenalty * SIMULATION_CONFIG.buildUpMovement.scoreWeights.shapePenaltyScale -
        movementWeights.forwardProgressReward * forwardBonus -
        movementWeights.freeSpaceReward * space
    );
}


function findBestPosition(player: PlayerState, ballHolder: PlayerState, teammates: PlayerState[], opponents: PlayerState[], movementWeights: PlayerProfile["movementWeights"]): Point {
    const origin = { x: player.x, y: player.y };
  
    let bestPoint = origin;
    let bestScore = scorePosition(origin, player, ballHolder, teammates, opponents, movementWeights);

    const STEPS = SIMULATION_CONFIG.buildUpMovement.search.radialSteps;

    for (const R of RADII) {
        for (let i = 0; i < STEPS; i++) {
            const angle = (i / STEPS) * Math.PI * 2;

            const test = {
                x: origin.x + Math.cos(angle) * R,
                y: origin.y + Math.sin(angle) * R
            };

            if (!roleRestrictions(test, player)) continue;
            
            const score = scorePosition(test, player, ballHolder, teammates, opponents, movementWeights);
            
            if (score < bestScore) {
                bestScore = score;
                bestPoint = test;
            }
        }
    }
  
    return bestPoint;
}


function findBestForwardPosition(player: PlayerState, ballHolder: PlayerState, teammates: PlayerState[], opponents: PlayerState[], movementWeights: PlayerProfile["movementWeights"]): Point {
    const origin = { x: player.x, y: player.y };

    let bestPoint = origin;
    let bestScore = scorePosition(origin, player, ballHolder, teammates, opponents, movementWeights);

    const currentlyOffside = isPointOffside(origin, ballHolder, opponents);
    const STEPS = SIMULATION_CONFIG.buildUpMovement.search.radialSteps;

    for (const R of RADII) {
        for (let i = 0; i < STEPS; i++) {
            let angle: number;

            if (currentlyOffside) {
                // Search for positions to get back onside
                const BACKWARD = Math.PI / 2;     // +90°
                const CONE = Math.PI / 2;         // +/-90°
                angle = BACKWARD - CONE + (i / (STEPS - 1)) * (2 * CONE);
            } else {
                // Normal attacking search
                const FORWARD = -Math.PI / 2;     // -90°
                const CONE = Math.PI / 3;         // +/-60°
                angle = FORWARD - CONE + (i / (STEPS - 1)) * (2 * CONE);
            }

            const test = {
                x: origin.x + Math.cos(angle) * R,
                y: origin.y + Math.sin(angle) * R
            };

            if (!currentlyOffside && test.y > origin.y) continue;
            if (!roleRestrictions(test, player)) continue;

            const score = scorePosition(test, player, ballHolder, teammates, opponents, movementWeights);

            if (score < bestScore) {
                bestScore = score;
                bestPoint = test;
            }
        }
    }

    return bestPoint;
}


// Determine the target position for a player during build-up play
export function getPlayerTarget(player: PlayerState, ball: Ball, teammates: PlayerState[], opponents: PlayerState[],movementWeights: PlayerProfile["movementWeights"]): Point{
    const currPos = { x: player.x, y: player.y };

    if (ball.holderIndex === null) {
        return currPos;
    }

    const ballHolder = teammates[ball.holderIndex];
    const support = shouldSupport(player, ballHolder);
    const hardLaneBlocked = isLaneHardBlocked(ballHolder, currPos, opponents);

    if ((teammates[ball.holderIndex] === player) || support || hardLaneBlocked){
        return findBestPosition(player, ballHolder, teammates, opponents, movementWeights);
    }

    // validate passing option
    const softLaneBlocked = isLaneSoftBlocked(ballHolder, currPos, opponents, PASS_BLOCK_DIST);
    const freeSpaceOK = (getFreeSpace(currPos, opponents) >= getMinimumFreeSpacePerRole(player));

    if (!softLaneBlocked && freeSpaceOK){
        return findBestForwardPosition(player, ballHolder, teammates, opponents, movementWeights);
    }

    return findBestPosition(player, ballHolder, teammates, opponents, movementWeights);
}