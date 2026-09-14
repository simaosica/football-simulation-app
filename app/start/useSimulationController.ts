// app/start/useSimulationController.ts
'use client';
import { useEffect, useRef, useState } from 'react';
import { GameState, PlayerState, TacticalProfile, PassDebugLine, SimulationEndMessageKey } from '@/engine/models/types';
import { getPassOptions, passScore } from '@/engine/core/passing';
import { simulateTick } from '@/engine/simulation/tick';
import { DEBUG_CONFIG } from '@/engine/models/debugConfig';
import { SIMULATION_CONFIG } from '@/engine/models/simulationConfig';

type UseSimulationControllerParams = {
  mainPlayers: PlayerState[];
  opponentPlayers: PlayerState[];
  tacticalProfile: TacticalProfile;
};

type UseSimulationControllerReturn = {
  gameState: GameState;
  isPlaying: boolean;
  isPaused: boolean;
  simulationFinished: boolean;
  simulationEndMessageKey: SimulationEndMessageKey | null;
  useSameVariation: boolean;
  setUseSameVariation: React.Dispatch<React.SetStateAction<boolean>>;
  currentRunSeed: number | null;
  showPassDebug: boolean;
  setShowPassDebug: React.Dispatch<React.SetStateAction<boolean>>;
  passDebugLines: PassDebugLine[];
  decisionPressureDebug: number | null;
  startDynamicPlay: () => void;
  resetDynamicPlay: () => void;
  togglePausePlay: () => void;
  resetSimulationSession: () => void;
};

export default function useSimulationController({
  mainPlayers,
  opponentPlayers,
  tacticalProfile,
}: UseSimulationControllerParams): UseSimulationControllerReturn {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const coachIntentRef = useRef<TacticalProfile | null>(null);

  const [useSameVariation, setUseSameVariation] = useState(false);
  const [currentRunSeed, setCurrentRunSeed] = useState<number | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [simulationFinished, setSimulationFinished] = useState(false);
  const [simulationEndMessageKey, setSimulationEndMessageKey] = useState<
    SimulationEndMessageKey | null
  >(null);

  const [showPassDebug, setShowPassDebug] = useState(false);
  const [passDebugLines, setPassDebugLines] = useState<PassDebugLine[]>([]);
  const showPassDebugRef = useRef(false);
  const [decisionPressureDebug, setDecisionPressureDebug] = useState<number | null>(null);

  function generateSeed(): number {
    return Math.floor(Math.random() * 2147483647) >>> 0;
  }

  function buildGameState(seed?: number): GameState {
    const normalizedSeed = (seed ?? generateSeed()) >>> 0;
    const mainGK = mainPlayers[0];

    return {
      ball: { x: mainGK.x, y: mainGK.y, holderIndex: 0, target: null },
      mainPlayers: structuredClone(mainPlayers),
      opponentPlayers: structuredClone(opponentPlayers),
      buildUpStarted: false,
      decisionPressure: 0,
      completedPasses: 0,
      initialSeed: normalizedSeed,
      rngState: normalizedSeed,
      tickCount: 0,
    };
  }

  const [gameState, setGameState] = useState<GameState>(() => {
    const seed = generateSeed();
    return buildGameState(seed);
  });

  const gameStateRef = useRef<GameState>(gameState);

  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  useEffect(() => {
    showPassDebugRef.current = showPassDebug;
  }, [showPassDebug]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, []);

  const runDynamicPlayLoop = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    intervalRef.current = setInterval(() => {
      if (!coachIntentRef.current) return;

      const result = simulateTick(
        gameStateRef.current,
        coachIntentRef.current,
        SIMULATION_CONFIG.simulation.decisionPressureRadius,
        SIMULATION_CONFIG.simulation.buildUpTickLimit,
        SIMULATION_CONFIG.simulation.successLineY,
        SIMULATION_CONFIG.simulation.opponentSpeed,
        SIMULATION_CONFIG.simulation.ballSpeed
      );

      if (result.finished) {
        const finalState = structuredClone(result.nextState);
        gameStateRef.current = finalState;
        setGameState(finalState);

        clearInterval(intervalRef.current!);
        intervalRef.current = null;
        setIsPlaying(false);
        setIsPaused(false);
        setSimulationFinished(true);
        setSimulationEndMessageKey(result.endMessageKey ?? null);
        return;
      }

      const currentState: GameState = structuredClone(result.nextState);
      setDecisionPressureDebug(currentState.decisionPressure);

      const holder = currentState.ball.holderIndex;

      if (currentState.ball.target !== null || !showPassDebugRef.current) {
        setPassDebugLines([]);
      } else if (
        showPassDebugRef.current &&
        holder !== null &&
        holder < currentState.mainPlayers.length
      ) {
        const passer = currentState.mainPlayers[holder];
        const profile = passer.profile;
        const options = getPassOptions(currentState, coachIntentRef.current);
        const from = { x: passer.x, y: passer.y };

        const debugLines: PassDebugLine[] = options
          .map((opt) => {
            const score = passScore(opt, currentState, coachIntentRef.current!, profile);
            if (!Number.isFinite(score)) return null;

            const toPlayer = currentState.mainPlayers[opt.receiverIndex];
            return {
              from,
              to: { x: toPlayer.x, y: toPlayer.y },
              score,
            };
          })
          .filter((line): line is Omit<PassDebugLine, 'rank'> => line !== null)
          .sort((a, b) => a.score - b.score)
          .slice(0, 3)
          .map((line, index) => ({ ...line, rank: index as 0 | 1 | 2 }));

        setPassDebugLines(debugLines);
      }

      gameStateRef.current = currentState;
      setGameState(currentState);
    }, SIMULATION_CONFIG.simulation.loopInterval);
  };

  function applyStoppedState(newState: GameState) {
    gameStateRef.current = newState;
    setGameState(newState);
  
    setPassDebugLines([]);
    setDecisionPressureDebug(null);
  
    setSimulationFinished(false);
    setSimulationEndMessageKey(null);
    setIsPlaying(false);
    setIsPaused(false);
  }

  function stopLoop() {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }

  const startDynamicPlay = () => {
    if (isPlaying) return;

    const seedToUse =
      useSameVariation && currentRunSeed !== null ? currentRunSeed : generateSeed();

    const newState = buildGameState(seedToUse);

    gameStateRef.current = newState;
    setGameState(newState);
    setCurrentRunSeed(seedToUse);

    coachIntentRef.current = structuredClone(tacticalProfile);
    setIsPlaying(true);
    setIsPaused(false);
    setSimulationFinished(false);
    setSimulationEndMessageKey(null);

    setPassDebugLines([]);
    setDecisionPressureDebug(null);

    if (DEBUG_CONFIG.logControllerEvents) {
      console.log('------------- STARTING SIMULATION -------------');
      console.log('Simulation Seed:', seedToUse);
    }

    runDynamicPlayLoop();
  };

  const resetDynamicPlay = () => {
    stopLoop();
  
    const seedToUse = currentRunSeed ?? generateSeed();
    const newState = buildGameState(seedToUse);
  
    applyStoppedState(newState);
  
    if (DEBUG_CONFIG.logControllerEvents) {
      console.log('Play reset: ball back to goalkeeper');
    }
  };

  const togglePausePlay = () => {
    if (simulationFinished) return;

    if (isPlaying && intervalRef.current) {
        stopLoop();
        setIsPlaying(false);
        setIsPaused(true);
        return;
    }

    if (isPaused) {
        setIsPlaying(true);
        setIsPaused(false);
        runDynamicPlayLoop();
    }
  };

  const resetSimulationSession = () => {
    stopLoop();
  
    const newState = buildGameState();
  
    applyStoppedState(newState);
    setCurrentRunSeed(null);
    setUseSameVariation(false);
  };

  return {
    gameState,
    isPlaying,
    isPaused,
    simulationFinished,
    simulationEndMessageKey,
    useSameVariation,
    setUseSameVariation,
    currentRunSeed,
    showPassDebug,
    setShowPassDebug,
    passDebugLines,
    decisionPressureDebug,
    startDynamicPlay,
    resetDynamicPlay,
    togglePausePlay,
    resetSimulationSession,
  };
}