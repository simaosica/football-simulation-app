// engine/models/constants.ts
import { PlayerState, PlayerProfile } from './types';

/* ========================================== */
/* PLAYER PROFILES */
/* ========================================== */
export const DEFAULT_PROFILE: PlayerProfile = {name: "DEFAULT_PROFILE",
  speed: 0.09,
  passingWeights: {
    distance: 1,
    forwardProgress: 1,
    laneSafety: 1,
    receiverPressurePenalty: 1,
    // sideBias
  },
  movementWeights: {
    spacingPenalty: 1,
    freeSpaceReward: 1,
    forwardProgressReward: 1,
    shapePenalty: 1
  }
};

/* ========================================== */
/* GK PROFILES */
/* ========================================== */
const DEFAULT_GK_PROFILE: PlayerProfile = {name: "DEFAULT_GK_PROFILE",
  speed: 0.09,
  passingWeights: {
    distance: 2,
    forwardProgress: 0.5,
    laneSafety: 4,
    receiverPressurePenalty: 3,
    sideBias: 1
  },
  movementWeights: {
    spacingPenalty: 1,
    freeSpaceReward: 1,
    forwardProgressReward: 0.5,
    shapePenalty: 1
  }
};

const SWEEPER_GK_PROFILE: PlayerProfile = {name: "SWEEPER_GK_PROFILE",
  speed: 0.09,
  passingWeights: {
    distance: 1.5,
    forwardProgress: 0.7,
    laneSafety: 2.5,
    receiverPressurePenalty: 2,
    sideBias: 1
  },
  movementWeights: {
    spacingPenalty: 1,
    freeSpaceReward: 1,
    forwardProgressReward: 1,
    shapePenalty: 1
  }
};

/* ========================================== */
/* CB PROFILES */
/* ========================================== */
const DEFAULT_CB_PROFILE: PlayerProfile = {name: "DEFAULT_CB_PROFILE",
  speed: 0.09,
  passingWeights: {
    distance: 1.3,
    forwardProgress: 0.2,
    laneSafety: 2.5,
    receiverPressurePenalty: 1.5
  },
  movementWeights: {
    spacingPenalty: 1,
    freeSpaceReward: 1,
    forwardProgressReward: 0.5,
    shapePenalty: 1
  }
};

const LINE_BREAKER_CB_PROFILE: PlayerProfile = {name: "LINE_BREAKER_CB_PROFILE",
  speed: 0.09,
  passingWeights: {
    distance: 1,
    forwardProgress: 1,
    laneSafety: 1.5,
    receiverPressurePenalty: 1
  },
  movementWeights: {
    spacingPenalty: 1,
    freeSpaceReward: 1,
    forwardProgressReward: 0.7,
    shapePenalty: 1
  }
};

/* ========================================== */
/* FULLBACK PROFILES */
/* ========================================== */
const DEFAULT_FULLBACK_PROFILE: PlayerProfile = {name: "DEFAULT_FULLBACK_PROFILE",
  speed: 0.09,
  passingWeights: {
    distance: 1,
    forwardProgress: 0.8,
    laneSafety: 1.2,
    receiverPressurePenalty: 1
  },
  movementWeights: {
    spacingPenalty: 1,
    freeSpaceReward: 1,
    forwardProgressReward: 1,
    shapePenalty: 1
  }
};

const OVERLAPPING_FULLBACK_PROFILE: PlayerProfile = {name: "OVERLAPPING_FULLBACK_PROFILE",
  speed: 0.09,
  passingWeights: {
    distance: 0.8,
    forwardProgress: 1.4,
    laneSafety: 1,
    receiverPressurePenalty: 0.9
  },
  movementWeights: {
    spacingPenalty: 1,
    freeSpaceReward: 1,
    forwardProgressReward: 1.3,
    shapePenalty: 1
  }
};

/* ========================================== */
/* MIDFIELDER PROFILES */
/* ========================================== */
const DEFAULT_MIDFIELDER_PROFILE: PlayerProfile = {name: "DEFAULT_MIDFIELDER_PROFILE",
  speed: 0.09,
  passingWeights: {
    distance: 1.2,
    forwardProgress: 1,
    laneSafety: 1.2,
    receiverPressurePenalty: 1.0
  },
  movementWeights: {
    spacingPenalty: 1,
    freeSpaceReward: 1.5,
    forwardProgressReward: 1.5,
    shapePenalty: 1
  }
};

const RISKY_MIDFIELDER_PROFILE: PlayerProfile = {name: "RISKY_MIDFIELDER_PROFILE",
  speed: 0.09,
  passingWeights: {
    distance: 0.8,
    forwardProgress: 1.6,
    laneSafety: 0.9,
    receiverPressurePenalty: 0.7
  },
  movementWeights: {
    spacingPenalty: 1,
    freeSpaceReward: 1.8,
    forwardProgressReward: 1.3,
    shapePenalty: 1
  }
};

/* ========================================== */
/* ATTACKER PROFILES */
/* ========================================== */
const DEFAULT_ATTACKER_PROFILE: PlayerProfile = {name: "DEFAULT_ATTACKER_PROFILE",
  speed: 0.09,
  passingWeights: {
    distance: 1,
    forwardProgress: 1.5,
    laneSafety: 0.8,
    receiverPressurePenalty: 0.7
  },
  movementWeights: {
    spacingPenalty: 1,
    freeSpaceReward: 0.8,
    forwardProgressReward: 1,
    shapePenalty: 1
  }
};

const WINGER_PROFILE: PlayerProfile = {name: "WINGER_PROFILE",
  speed: 0.09,
  passingWeights: {
    distance: 0.9,
    forwardProgress: 1.7,
    laneSafety: 0.7,
    receiverPressurePenalty: 0.6
  },
  movementWeights: {
    spacingPenalty: 1,
    freeSpaceReward: 0.7,
    forwardProgressReward: 1,
    shapePenalty: 1
  }
};

const STRIKER_PROFILE: PlayerProfile = {name: "STRIKER_PROFILE",
  speed: 0.09,
  passingWeights: {
    distance: 1.2,
    forwardProgress: 1.4,
    laneSafety: 0.9,
    receiverPressurePenalty: 0.8
  },
  movementWeights: {
    spacingPenalty: 1,
    freeSpaceReward: 0.6,
    forwardProgressReward: 1,
    shapePenalty: 1
  }
};

/* ========================================== */
/* PLAYER PROFILE CATALOG */
/* ========================================== */
export const PLAYER_PROFILE_CATALOG = {
  DEFAULT: DEFAULT_PROFILE,
  DEFAULT_GK: DEFAULT_GK_PROFILE,
  SWEEPER_GK: SWEEPER_GK_PROFILE,
  DEFAULT_CB: DEFAULT_CB_PROFILE,
  LINE_BREAKER_CB: LINE_BREAKER_CB_PROFILE,
  DEFAULT_FULLBACK: DEFAULT_FULLBACK_PROFILE,
  OVERLAPPING_FULLBACK: OVERLAPPING_FULLBACK_PROFILE,
  DEFAULT_MIDFIELDER: DEFAULT_MIDFIELDER_PROFILE,
  RISKY_MIDFIELDER: RISKY_MIDFIELDER_PROFILE,
  DEFAULT_ATTACKER: DEFAULT_ATTACKER_PROFILE,
  WINGER: WINGER_PROFILE,
  STRIKER: STRIKER_PROFILE
} as const;

// Utility function to get player role from position
export function getRoleFromPosition(position: PlayerState['position']): PlayerState['role'] {
  const gKPositions = ['GK'];
  const defPositions = ['LB', 'LWB', 'LCB', 'CB', 'RCB', 'RB', 'RWB'];
  const midPositions = ['CDM', 'LCDM', 'RCDM', 'CM', 'LCM', 'RCM', 'LM', 'RM', 'CAM', 'LCAM', 'RCAM'];

  if (gKPositions.includes(position)) return 'GK';
  else if (defPositions.includes(position)) return 'DEF';
  else if (midPositions.includes(position)) return 'MID';
  else return 'FWD';
}

/* ========================================== */
/* MAIN TEAM - 0 <= x <= 68 | 0 <= y <= 105 */
/* ========================================== */
// Define player positions for different formations
export const formationLayouts: Record<string, PlayerState[]> = {
  '4-3-3': [
    { x: 34, y: 102, formationX: 34, formationY: 102, team: 'MAIN', shirtNumber: 1,  role: 'GK',  position: 'GK',   profile: DEFAULT_GK_PROFILE },
    { x: 4,  y: 90,  formationX: 4,  formationY: 90,  team: 'MAIN', shirtNumber: 5,  role: 'DEF', position: 'LB',   profile: DEFAULT_FULLBACK_PROFILE },
    { x: 20, y: 97,  formationX: 20, formationY: 97,  team: 'MAIN', shirtNumber: 4,  role: 'DEF', position: 'LCB',  profile: DEFAULT_CB_PROFILE },
    { x: 48, y: 97,  formationX: 48, formationY: 97,  team: 'MAIN', shirtNumber: 3,  role: 'DEF', position: 'RCB',  profile: DEFAULT_CB_PROFILE },
    { x: 64, y: 90,  formationX: 64, formationY: 90,  team: 'MAIN', shirtNumber: 2,  role: 'DEF', position: 'RB',   profile: DEFAULT_FULLBACK_PROFILE },
    { x: 20, y: 78,  formationX: 20, formationY: 78,  team: 'MAIN', shirtNumber: 6,  role: 'MID', position: 'LCDM', profile: DEFAULT_MIDFIELDER_PROFILE },
    { x: 34, y: 68,  formationX: 34, formationY: 68,  team: 'MAIN', shirtNumber: 10, role: 'MID', position: 'CM',   profile: RISKY_MIDFIELDER_PROFILE },
    { x: 48, y: 78,  formationX: 48, formationY: 78,  team: 'MAIN', shirtNumber: 8,  role: 'MID', position: 'RCDM', profile: DEFAULT_MIDFIELDER_PROFILE },
    { x: 6,  y: 58,  formationX: 6,  formationY: 58,  team: 'MAIN', shirtNumber: 11, role: 'FWD', position: 'LW',   profile: WINGER_PROFILE },
    { x: 34, y: 54,  formationX: 34, formationY: 54,  team: 'MAIN', shirtNumber: 9,  role: 'FWD', position: 'ST',   profile: STRIKER_PROFILE },
    { x: 62, y: 58,  formationX: 62, formationY: 58,  team: 'MAIN', shirtNumber: 7,  role: 'FWD', position: 'RW',   profile: WINGER_PROFILE }
  ],
  '4-4-2': [
    { x: 34, y: 102, formationX: 34, formationY: 102, team: 'MAIN', shirtNumber: 1,  role: 'GK',  position: 'GK',   profile: DEFAULT_GK_PROFILE },
    { x: 4,  y: 90,  formationX: 4,  formationY: 90,  team: 'MAIN', shirtNumber: 5,  role: 'DEF', position: 'LB',   profile: DEFAULT_FULLBACK_PROFILE },
    { x: 20, y: 97,  formationX: 20, formationY: 97,  team: 'MAIN', shirtNumber: 4,  role: 'DEF', position: 'LCB',  profile: DEFAULT_CB_PROFILE },
    { x: 48, y: 97,  formationX: 48, formationY: 97,  team: 'MAIN', shirtNumber: 3,  role: 'DEF', position: 'RCB',  profile: DEFAULT_CB_PROFILE },
    { x: 64, y: 90,  formationX: 64, formationY: 90,  team: 'MAIN', shirtNumber: 2,  role: 'DEF', position: 'RB',   profile: DEFAULT_FULLBACK_PROFILE },
    { x: 22, y: 74,  formationX: 22, formationY: 74,  team: 'MAIN', shirtNumber: 6,  role: 'MID', position: 'LCM', profile: DEFAULT_MIDFIELDER_PROFILE },
    { x: 46, y: 74,  formationX: 46, formationY: 74,  team: 'MAIN', shirtNumber: 8,  role: 'MID', position: 'RCM', profile: DEFAULT_MIDFIELDER_PROFILE },
    { x: 5,  y: 70,  formationX: 5,  formationY: 70,  team: 'MAIN', shirtNumber: 11, role: 'MID', position: 'LM',  profile: WINGER_PROFILE },
    { x: 63, y: 70,  formationX: 63, formationY: 70,  team: 'MAIN', shirtNumber: 7,  role: 'MID', position: 'RM',  profile: WINGER_PROFILE },
    { x: 24, y: 57,  formationX: 24, formationY: 57,  team: 'MAIN', shirtNumber: 9,  role: 'FWD', position: 'ST',  profile: STRIKER_PROFILE },
    { x: 44, y: 57,  formationX: 44, formationY: 57,  team: 'MAIN', shirtNumber: 10, role: 'FWD', position: 'ST',  profile: STRIKER_PROFILE }
  ]
};

/* ========================================== */
/* OPPONENT TEAM - 0 <= x <= 68 | 0 <= y <= 105 */
/* ========================================== */
// Define opponent player positions for different formations
export const opponentFormationLayouts: Record<string, PlayerState[]> = {
  '4-4-2': [
    { x: 34, y: 3,  formationX: 34, formationY: 3,  team: 'OPPONENT', shirtNumber: 1,  role: 'GK',  position: 'GK' , profile: DEFAULT_PROFILE  },
    { x: 11, y: 54, formationX: 11, formationY: 54, team: 'OPPONENT', shirtNumber: 2,  role: 'DEF', position: 'RB' , profile: DEFAULT_PROFILE  },
    { x: 25, y: 51, formationX: 25, formationY: 51, team: 'OPPONENT', shirtNumber: 3,  role: 'DEF', position: 'RCB', profile: DEFAULT_PROFILE  },
    { x: 43, y: 51, formationX: 43, formationY: 51, team: 'OPPONENT', shirtNumber: 4,  role: 'DEF', position: 'LCB', profile: DEFAULT_PROFILE  },
    { x: 57, y: 54, formationX: 57, formationY: 54, team: 'OPPONENT', shirtNumber: 5,  role: 'DEF', position: 'LB' , profile: DEFAULT_PROFILE  },
    { x: 10, y: 75, formationX: 10, formationY: 75, team: 'OPPONENT', shirtNumber: 7,  role: 'MID', position: 'RM' , profile: DEFAULT_PROFILE  },
    { x: 58, y: 75, formationX: 58, formationY: 75, team: 'OPPONENT', shirtNumber: 11, role: 'MID', position: 'LM' , profile: DEFAULT_PROFILE  },
    { x: 25, y: 67, formationX: 25, formationY: 67, team: 'OPPONENT', shirtNumber: 6,  role: 'MID', position: 'RCM', profile: DEFAULT_PROFILE  },
    { x: 43, y: 67, formationX: 43, formationY: 67, team: 'OPPONENT', shirtNumber: 8,  role: 'MID', position: 'LCM', profile: DEFAULT_PROFILE  },
    { x: 27, y: 84, formationX: 27, formationY: 84, team: 'OPPONENT', shirtNumber: 9,  role: 'FWD', position: 'LST', profile: DEFAULT_PROFILE  },
    { x: 41, y: 84, formationX: 41, formationY: 84, team: 'OPPONENT', shirtNumber: 10, role: 'FWD', position: 'RST', profile: DEFAULT_PROFILE  }
  ]
};