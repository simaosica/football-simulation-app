// engine/simulation/tick.ts
import { GameState, PlayerState, TacticalProfile, SimulationEndMessageKey } from "../models/types";
import { getPlayerTarget, clampToRoleZone } from "../core/buildUpMovement";
import { movePlayerToward, clampToPitch, moveBallTowardsTarget, dist, distancePointToSegment } from "../core/geometry";
import { computePressingLogic, getSTtarget, getWMtarget, getCMtarget, getCBtarget, getFBtarget } from "../core/pressing";
import { getReceiverPressure, getTempoPressureRate, chooseNextPass } from "../core/passing";
import { SIMULATION_CONFIG } from "../models/simulationConfig";
import { DEBUG_CONFIG } from "../models/debugConfig";

const INTERCEPTION_RADIUS = SIMULATION_CONFIG.simulation.interceptionRadius;

export interface TickResult {
    nextState: GameState;
    finished: boolean;
    success: boolean;
    endMessageKey?: SimulationEndMessageKey;
}

export function simulateTick(
    state: GameState,
    tacticalProfile: TacticalProfile,
    decisionPressureRadius: number,
    tickLimit: number,
    successLineY: number,
    opponentSpeed: number,
    ballSpeed: number
): TickResult {

    const currentState = structuredClone(state);
    currentState.tickCount += 1;
    const holderIndex = currentState.ball.holderIndex;
    const holderIsValid = holderIndex !== null && holderIndex < currentState.mainPlayers.length;

    // Opponent possession
    if (holderIndex === null || holderIndex >= currentState.mainPlayers.length) {
        if (DEBUG_CONFIG.logSimulationEvents) {
            console.log("POSSESSION LOST!");
        }
        return {
            nextState: currentState,
            finished: true,
            success: false,
            endMessageKey: "possessionLost",
        };
    }
    
    // Timeout
    if (currentState.tickCount > tickLimit) {
        if (DEBUG_CONFIG.logSimulationEvents) {
            console.log("EXECUTION TIME LIMIT REACHED!");
        }
        return {
            nextState: currentState,
            finished: true,
            success: false,
            endMessageKey: "executionTimeLimitReached",
        };
    }

    // Build-up success
    const successfulBuildUp =
        currentState.ball.target === null &&
        holderIndex !== null &&
        holderIndex < currentState.mainPlayers.length &&
        currentState.ball.y <= successLineY;

    if (successfulBuildUp) {
        if (DEBUG_CONFIG.logSimulationEvents) {
            console.log("BUILD-UP SUCCESSFUL!");
        }
        return {
            nextState: currentState,
            finished: true,
            success: true,
            endMessageKey: "buildUpSuccessful",
        };
    }

    // Pass limit reached
    if (currentState.completedPasses >= tacticalProfile.maxPasses) {
        if (DEBUG_CONFIG.logSimulationEvents) {
            console.log("PASS LIMIT REACHED!");
        }
        return {
            nextState: currentState,
            finished: true,
            success: false,
            endMessageKey: "passLimitReached",
        };
    }

    // --- PLAYER MOVEMENT ---
    const newPlayerStates: PlayerState[] = currentState.mainPlayers.map(p => ({ ...p }));
    const ball = currentState.ball;
    
    if (currentState.buildUpStarted) {
        const playerTargets = newPlayerStates.map(p =>
            getPlayerTarget(p, ball, newPlayerStates, currentState.opponentPlayers, p.profile.movementWeights)
        );
    
        newPlayerStates.forEach((p, i) => {
            const target = playerTargets[i];
            const constrainedTarget = clampToRoleZone(target, p);
        
            movePlayerToward(p, constrainedTarget, p.profile.speed);
            clampToPitch(p);
        });
    } else {
        newPlayerStates.forEach(clampToPitch);
    }
    
    currentState.mainPlayers = newPlayerStates;

    // --- OPPONENT PRESSING MOVEMENT ---
    if (currentState.buildUpStarted) {

        const pressing = computePressingLogic(
            currentState.opponentPlayers,
            currentState.mainPlayers,
            currentState.ball,
            currentState.lastPresserIndex ?? null
        );
          
        currentState.lastPresserIndex = pressing.presserIndex;

        currentState.opponentPlayers.forEach((opp, idx) => {
            let target: { x: number; y: number } | null = null;

            switch (opp.position) {
                case "ST": case "RST": case "LST":
                    target = getSTtarget(idx, currentState, pressing);
                    break;

                case "RM": case "LM":
                    target = getWMtarget(idx, currentState, pressing);
                    break;

                case "CM": case "RCM": case "LCM":
                    target = getCMtarget(idx, currentState, pressing);
                    break;

                case "RB": case "RWB": case "LB": case "LWB":
                    target = getFBtarget(idx, currentState, pressing);
                    break;

                case "CB": case "LCB": case "RCB":
                    target = getCBtarget(idx, currentState, pressing);
                    break;
            }
            if (!target) return;

            movePlayerToward(opp, target, opponentSpeed);
        });
    }

    // --- BALL FOLLOWS HOLDER ---
    if (!currentState.ball.target && holderIsValid) {
        const holder = currentState.mainPlayers[holderIndex];
        currentState.ball.x = holder.x;
        currentState.ball.y = holder.y;
    }

    // --- DECISION PRESSURE ACCUMULATION ---
    if (currentState.ball.target === null && holderIsValid) {
        const holder = currentState.mainPlayers[holderIndex];

        const opponentPressure = getReceiverPressure(holder, currentState.opponentPlayers, decisionPressureRadius);

        const tempoPressure = getTempoPressureRate(tacticalProfile.tempo);

        // Frame-based pressure accumulation
        currentState.decisionPressure += tempoPressure + opponentPressure * 0.2;
    }

    // --- PASS DECISION ---
    if (!currentState.ball.target && holderIsValid && currentState.decisionPressure >= SIMULATION_CONFIG.simulation.decisionPressureThreshold) {
        const receiverIndex = chooseNextPass(currentState, tacticalProfile);

        if (receiverIndex !== null) {
            const receiver = currentState.mainPlayers[receiverIndex];

            currentState.ball.target = {
                x: receiver.x,
                y: receiver.y,
                targetIndex: receiverIndex,
            };

            if (!currentState.buildUpStarted) {
                currentState.buildUpStarted = true;
            }
        }
    }

    // --- BALL MOVEMENT (IN FLIGHT) ---
    const target = currentState.ball.target;
    if (target) {
        const previousX = currentState.ball.x;
        const previousY = currentState.ball.y;

        const fixedTarget = { x: target.x, y: target.y };

        moveBallTowardsTarget(currentState.ball, fixedTarget, ballSpeed);

        // --- INTERCEPTION CHECK DURING FLIGHT ---
        for (let idx = 0; idx < currentState.opponentPlayers.length; idx++) {

            const opp = currentState.opponentPlayers[idx];

            const d = distancePointToSegment(opp, { x: previousX, y: previousY }, currentState.ball);

            if (d < INTERCEPTION_RADIUS) {            
                currentState.ball.x = opp.x;
                currentState.ball.y = opp.y;
            
                currentState.ball.holderIndex = currentState.mainPlayers.length + idx;
            
                currentState.ball.target = null;
            
                if (DEBUG_CONFIG.logSimulationEvents) {
                    console.log("INTERCEPTED by", idx);
                }
            
                return {
                    nextState: currentState,
                    finished: true,
                    success: false,
                    endMessageKey: "possessionLost",
                };
            }
        }

        // --- NORMAL RECEPTION ---
        if (dist(currentState.ball, fixedTarget) < 0.01) {
            currentState.ball.holderIndex = target.targetIndex;
            currentState.ball.target = null;
        
            const receiver = currentState.mainPlayers[target.targetIndex];
            currentState.ball.x = receiver.x;
            currentState.ball.y = receiver.y;
        
            currentState.decisionPressure = 0;
            currentState.completedPasses += 1;
        }
    }

    return {
        nextState: currentState,
        finished: false,
        success: false,
        endMessageKey: undefined,
    };
}