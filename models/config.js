export const STORAGE_KEY = "campusfest-optimizer-pro-v2";

export const FESTIVAL_START_TIME = "09:00";
export const FESTIVAL_END_TIME = "21:30";

export const STAGE_LABELS = ["Stage A", "Stage B", "Stage C", "Stage D"];

export const DEFAULT_SETTINGS = {
  budget: 100,
  staffLimit: 32,
  equipmentLimit: 22,
  stageCount: 2,
  priorityWeight: 7,
  minPriority: 1,
};

export const DEFAULT_PRESET_ID = "balanced";
export const PRESET_CUSTOM_ID = "custom";

export const SCENARIO_PRESETS = [
  {
    id: "balanced",
    label: "Balanced Capstone",
    description: "Default showcase mode with clear differences between exact and heuristic planners.",
    settings: {
      budget: 100,
      staffLimit: 32,
      equipmentLimit: 22,
      stageCount: 2,
      priorityWeight: 7,
      minPriority: 1,
    },
    categories: null,
  },
  {
    id: "prestige",
    label: "Prestige Night",
    description: "Bias toward prime-time, premium crowd-pullers, and executive-priority events.",
    settings: {
      budget: 120,
      staffLimit: 35,
      equipmentLimit: 24,
      stageCount: 2,
      priorityWeight: 10,
      minPriority: 3,
    },
    categories: ["Tech", "Music", "Performance", "Showcase", "Gaming", "Arts", "Expo"],
  },
  {
    id: "throughput",
    label: "High Throughput",
    description: "Favor broader event coverage with lighter weight on elite priority bias.",
    settings: {
      budget: 95,
      staffLimit: 38,
      equipmentLimit: 25,
      stageCount: 3,
      priorityWeight: 4,
      minPriority: 1,
    },
    categories: null,
  },
  {
    id: "innovation",
    label: "Innovation Pulse",
    description: "Focus on robotics, startup, expo, esports, and high-visibility tech moments.",
    settings: {
      budget: 110,
      staffLimit: 34,
      equipmentLimit: 26,
      stageCount: 2,
      priorityWeight: 8,
      minPriority: 2,
    },
    categories: ["Tech", "Gaming", "Expo", "Design", "Showcase", "Music"],
  },
];
