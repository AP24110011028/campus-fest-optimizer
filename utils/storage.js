import {
  DEFAULT_PRESET_ID,
  DEFAULT_SETTINGS,
  PRESET_CUSTOM_ID,
  STORAGE_KEY,
} from "../models/config.js";
import { normalizeEvent, SAMPLE_EVENTS } from "../models/events.js";
import { clamp, cloneEvents, getSortedCategories } from "./helpers.js";
import { timeToMinutes } from "./time.js";

function sanitizeSettings(settings = {}) {
  return {
    budget: clamp(Number(settings.budget) || DEFAULT_SETTINGS.budget, 40, 160),
    staffLimit: clamp(Number(settings.staffLimit) || DEFAULT_SETTINGS.staffLimit, 10, 50),
    equipmentLimit: clamp(Number(settings.equipmentLimit) || DEFAULT_SETTINGS.equipmentLimit, 8, 36),
    stageCount: clamp(Number(settings.stageCount) || DEFAULT_SETTINGS.stageCount, 1, 4),
    priorityWeight: clamp(
      Number(settings.priorityWeight) || DEFAULT_SETTINGS.priorityWeight,
      0,
      12,
    ),
    minPriority: clamp(Number(settings.minPriority) || DEFAULT_SETTINGS.minPriority, 1, 5),
  };
}

export function buildDefaultState() {
  const events = cloneEvents(SAMPLE_EVENTS);
  return {
    events,
    settings: { ...DEFAULT_SETTINGS },
    selectedCategories: getSortedCategories(events),
    activePreset: DEFAULT_PRESET_ID,
  };
}

export function loadState() {
  const fallback = buildDefaultState();

  if (typeof localStorage === "undefined") {
    return fallback;
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return fallback;
    }

    const parsed = JSON.parse(raw);
    const storedEvents = Array.isArray(parsed.events)
      ? parsed.events
          .map(normalizeEvent)
          .filter((event) => event.name && timeToMinutes(event.end) > timeToMinutes(event.start))
      : fallback.events;
    const categories = getSortedCategories(storedEvents);
    let selectedCategories = Array.isArray(parsed.selectedCategories)
      ? parsed.selectedCategories.filter((category) => categories.includes(category))
      : categories;

    if (categories.length > 0 && selectedCategories.length === 0) {
      selectedCategories = categories;
    }

    return {
      events: storedEvents,
      settings: sanitizeSettings(parsed.settings),
      selectedCategories,
      activePreset:
        typeof parsed.activePreset === "string" ? parsed.activePreset : PRESET_CUSTOM_ID,
    };
  } catch (error) {
    return fallback;
  }
}

export function saveState(state) {
  if (typeof localStorage === "undefined") {
    return;
  }

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      events: state.events,
      settings: state.settings,
      selectedCategories: state.selectedCategories,
      activePreset: state.activePreset,
    }),
  );
}

export function resetState(state) {
  const fresh = buildDefaultState();
  state.events = fresh.events;
  state.settings = fresh.settings;
  state.selectedCategories = fresh.selectedCategories;
  state.activePreset = fresh.activePreset;
}

export function syncSelectedCategories(state) {
  const categories = getSortedCategories(state.events);
  state.selectedCategories = state.selectedCategories.filter((category) =>
    categories.includes(category),
  );

  if (categories.length > 0 && state.selectedCategories.length === 0) {
    state.selectedCategories = categories;
  }
}
