// app/start/uiTypes.ts
import React from "react";
import { PlayerState, GameState, PassDebugLine } from "@/engine/models/types";

// Define the properties for the Player component
export type PlayerProps = {
  index: number;
  pos: Pick<PlayerState, 'x' | 'y' | 'shirtNumber'>;
  pitchSize: { width: number; height: number };
  onStop: (index: number, x: number, y: number) => void;
  playerRef: React.RefObject<HTMLDivElement | null>;
  isOpponent?: boolean;
  isSimulationMode?: boolean;
  onEdit?: (index: number) => void;
};

// Define the properties for the Pitch component
export type PitchProps = {
  mainPlayers: PlayerState[];
  opponentPlayers: PlayerState[];
  mainRefs: React.RefObject<HTMLDivElement | null>[];
  opponentRefs: React.RefObject<HTMLDivElement | null>[];
  onPlayerStop: (index: number, x: number, y: number) => void;
  onOpponentStop: (index: number, x: number, y: number) => void;
  gameState: GameState | null;
  isSimulationMode: boolean;
  onEditPlayer?: (index: number) => void;
  passDebugLines?: PassDebugLine[]; // Debug lines for passes
  decisionPressure?: number | null; // Debug value for decision pressure
};