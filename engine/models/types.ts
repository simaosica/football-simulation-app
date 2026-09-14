// engine/models/types.ts

// Define the type for application steps
export type AppStep = "SETUP" | "TACTICS" | "SIMULATION";

// Define the type for a point in 2D space
export type Point = { x: number; y: number };

export interface PressingLogic {
  presserIndex: number | null;
  screenIndex: number | null;
}

// Define the type for pass options
export type PassOption = {
  receiverIndex: number;
  distance: number;
  laneDanger: number;
  receiverPressure: number;
  forwardProgress: number;
};

export type PlayerState = {
  x: number; // Current x position on the pitch
  y: number; // Current y position on the pitch
  formationX: number; // static tactical anchor x position
  formationY: number; // static tactical anchor y position
  team: 'MAIN' | 'OPPONENT';
  shirtNumber: number;
  role: 'GK' | 'DEF' | 'MID' | 'FWD';
  position: 'GK' | 'LB' | 'LWB' | 'LCB' | 'CB' | 'RCB' | 'RB' | 'RWB' |
            'CDM' | 'LCDM' | 'RCDM' | 'CM' | 'LCM' | 'RCM' | 'LM' | 'RM' | 'CAM' | 'LCAM' | 'RCAM' |
            'LW' | 'RW' | 'ST' | 'LST' | 'RST';
  profile: PlayerProfile;
};

// Define the type for the Ball
export type Ball = {
  x: number;
  y: number;
  holderIndex: number | null;
  target: { x: number; y: number, targetIndex: number } | null;
};

// Debugging type for pass lines
export type PassDebugLine = {
  from: { x: number; y: number };
  to: { x: number; y: number };
  score: number;
  rank: 0 | 1 | 2;
};

// Define the type for the game state
export type GameState = {
  ball: Ball;
  mainPlayers: PlayerState[];
  opponentPlayers: PlayerState[];
  buildUpStarted: boolean;
  decisionPressure: number;
  completedPasses: number;
  lastPresserIndex?: number | null;
  initialSeed: number;
  rngState: number;
  tickCount: number;
};

// Define the type for tactical profiles (coach settings)
export type TacticalProfile = {
  buildUpSide: number; // -1 = full left, 0 = neutral, +1 = full right
  tempo: "SLOW" | "NORMAL" | "FAST";
  risk: "LOW" | "MEDIUM" | "HIGH";
  maxPasses: number;
};

// Define the interface for player profiles
export interface PlayerProfile {
  name: ProfileName;

  speed: number;

  passingWeights: {
    distance: number; // Pass Distance Cost (Higher = more likely to choose closer passes)
    forwardProgress: number; // Forward Progress Reward (Higher = more likely to choose forward passes)
    laneSafety: number; // Passing Lane Safety Reward (Higher = more likely to choose safer lanes)
    receiverPressurePenalty: number; // Receiver Pressure Penalty (Higher = more likely to avoid pressured receivers)
    sideBias?: number; // To respect coach input regarding build up 1st pass side (ALWAYS 1 on GK)
  };

  movementWeights: {
    spacingPenalty: number;
    freeSpaceReward: number;
    forwardProgressReward: number;
    shapePenalty: number;
  };
};

export type ProfileName =
    "DEFAULT_PROFILE"
  | "DEFAULT_GK_PROFILE"
  | "SWEEPER_GK_PROFILE"
  | "DEFAULT_CB_PROFILE"
  | "LINE_BREAKER_CB_PROFILE"
  | "DEFAULT_FULLBACK_PROFILE"
  | "OVERLAPPING_FULLBACK_PROFILE"
  | "DEFAULT_MIDFIELDER_PROFILE"
  | "RISKY_MIDFIELDER_PROFILE"
  | "DEFAULT_ATTACKER_PROFILE"
  | "WINGER_PROFILE"
  | "STRIKER_PROFILE";

export type SimulationEndMessageKey =
  | "possessionLost"
  | "executionTimeLimitReached"
  | "buildUpSuccessful"
  | "passLimitReached";

// Define the type for saved formations
export type SavedFormation = {
  id: string;
  name: string;
  players: PlayerState[];
  baseFormation: string;
  type: "MAIN" | "OPPONENT";
};