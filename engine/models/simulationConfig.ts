// engine/models/simulationConfig.ts

export const SIMULATION_CONFIG = {
  simulation: {
    interceptionRadius: 1.4,
    decisionPressureThreshold: 2.0,
    decisionPressureRadius: 12,
    buildUpTickLimit: 5000,
    successLineY: 50,
    opponentSpeed: 0.09,
    ballSpeed: 0.45,
    loopInterval: 20, // miliseconds
  },
  
  geometry: {
    pitchMargin: 2.3, // Keeps player markers visually inside the pitch boundaries
    hardLaneBlockDistance: 1.5,
  },
  
  passing: {
    absoluteMaxPassDistance: 60,
  
    riskRadius: {
      LOW: 13,
      MEDIUM: 10,
      HIGH: 7,
    },
  
    riskMultiplier: {
      LOW: 2,
      MEDIUM: 1,
      HIGH: 0.5,
    },
  
    passTemperature: {
      SLOW: 15,
      NORMAL: 25,
      FAST: 40,
    },
  
    tempoPressureRate: {
      SLOW: 0.01,
      NORMAL: 0.04,
      FAST: 0.07,
    },
  
    laneDangerWeightScale: 20,
    receiverPressureWeightScale: 20,
    sideBiasSoftPenalty: 50,
  },
  
  buildUpMovement: {
    passBlockDistance: 5,
    searchRadius: 8,
    formationMargin: 10,
    closeEnoughDistance: 25,
    teammateSpacingDistance: 13,
    softBlockedLanePenalty: 15,
    offsidePenaltyScale: 3,
    ballHolderFreeSpaceCap: 5,
    roleFreeSpace: {
      GK_DEF: 10,
      MID: 8,
      FWD: 7,
    },
    scoreWeights: {
      ballHolderSpacingPenaltyScale: 4,
      shapePenaltyScale: 2,
      supportSpacingPenaltyScale: 5,
    },
    search: {
      radialSteps: 8,
    },
    offside: {
      opponentHalfLineY: 52.5,
    },
    roleRestrictions: {
      goalkeeperMinX: 30,
      goalkeeperMaxX: 38,
    },
  },
  
  pressing: {
    defensiveLineBallOffset: 5,
    defensiveLineMaxY: 83,
    presserSwitchMargin: 0.8,
    screenWeights: {
      oppositeCB: 0.4,
      cdmsCenter: 0.6,
    },
    sideOffsets: {
      LST: -0.6,
      RST: 0.6,
      LM: -0.4,
      RM: 0.4,
      LCM: -0.3,
      RCM: 0.3,
      LB: -0.2,
      LWB: -0.2,
      RB: 0.2,
      RWB: 0.2,
    },
    rolePenalty: {
      ST: 0,
      CM: 0.2,
      CB: 0.6,
      DEFAULT: 0.3,
    },
    pressingFromBehindScale: 0.5,
  },
} as const;