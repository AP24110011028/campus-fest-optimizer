const STORAGE_KEY = "campusfest-optimizer-pro-v1";
const DEFAULT_SETTINGS = {
  budget: 100,
  stageCount: 2,
  priorityWeight: 7,
  minPriority: 1,
};
const DEFAULT_PRESET_ID = "balanced";
const PRESET_CUSTOM_ID = "custom";
const SCENARIO_PRESETS = [
  {
    id: "balanced",
    label: "Balanced Capstone",
    description: "Default showcase mode with clear DP and greedy differences.",
    settings: {
      budget: 100,
      stageCount: 2,
      priorityWeight: 7,
      minPriority: 1,
    },
    categories: null,
  },
  {
    id: "prestige",
    label: "Prestige Night",
    description: "Push flagship events harder with high priority emphasis.",
    settings: {
      budget: 120,
      stageCount: 2,
      priorityWeight: 10,
      minPriority: 3,
    },
    categories: ["Tech", "Music", "Performance", "Showcase", "Gaming", "Arts", "Expo"],
  },
  {
    id: "throughput",
    label: "High Throughput",
    description: "Favor more events and wider stage coverage with lower priority bias.",
    settings: {
      budget: 90,
      stageCount: 3,
      priorityWeight: 4,
      minPriority: 1,
    },
    categories: null,
  },
  {
    id: "innovation",
    label: "Innovation Pulse",
    description: "Tech-heavy mode for robotics, esports, design, expo, and showcase events.",
    settings: {
      budget: 110,
      stageCount: 2,
      priorityWeight: 8,
      minPriority: 2,
    },
    categories: ["Tech", "Gaming", "Expo", "Design", "Showcase", "Music"],
  },
];

const SAMPLE_EVENTS = [
  {
    id: "evt-1",
    name: "Design Jam",
    category: "Design",
    cost: 18,
    impact: 52,
    priority: 3,
    start: "09:00",
    end: "10:30",
    note: "Studio-style sprint for campus creatives.",
  },
  {
    id: "evt-2",
    name: "Robotics Arena",
    category: "Tech",
    cost: 24,
    impact: 68,
    priority: 5,
    start: "10:15",
    end: "12:00",
    note: "High-energy robot battle with faculty judges.",
  },
  {
    id: "evt-3",
    name: "Food Street",
    category: "Food",
    cost: 14,
    impact: 30,
    priority: 2,
    start: "11:10",
    end: "13:10",
    note: "Long-format tasting zone for student startups.",
  },
  {
    id: "evt-4",
    name: "Poetry Slam",
    category: "Arts",
    cost: 10,
    impact: 29,
    priority: 2,
    start: "13:05",
    end: "14:00",
    note: "Short spoken-word set with quick audience voting.",
  },
  {
    id: "evt-5",
    name: "Startup Sprint",
    category: "Tech",
    cost: 17,
    impact: 48,
    priority: 4,
    start: "13:25",
    end: "15:20",
    note: "Founder-style pitch sprint for rapid concepts.",
  },
  {
    id: "evt-6",
    name: "Stand-up Showcase",
    category: "Comedy",
    cost: 11,
    impact: 25,
    priority: 1,
    start: "15:00",
    end: "16:00",
    note: "Light comedy slot that fills transitions.",
  },
  {
    id: "evt-7",
    name: "Esports Clash",
    category: "Gaming",
    cost: 19,
    impact: 55,
    priority: 4,
    start: "16:05",
    end: "17:25",
    note: "Tournament final with large student draw.",
  },
  {
    id: "evt-8",
    name: "Indie Band Night",
    category: "Music",
    cost: 31,
    impact: 88,
    priority: 5,
    start: "17:00",
    end: "18:30",
    note: "Flagship concert block with the biggest evening pull.",
  },
  {
    id: "evt-9",
    name: "Dance Crew Finals",
    category: "Performance",
    cost: 27,
    impact: 78,
    priority: 4,
    start: "18:10",
    end: "19:30",
    note: "Final crew battle with premium crowd energy.",
  },
  {
    id: "evt-10",
    name: "Innovation Expo",
    category: "Expo",
    cost: 16,
    impact: 36,
    priority: 3,
    start: "10:30",
    end: "16:30",
    note: "Long-running innovation lane with prototypes on display.",
  },
  {
    id: "evt-11",
    name: "Film Night",
    category: "Cinema",
    cost: 13,
    impact: 27,
    priority: 2,
    start: "19:35",
    end: "21:05",
    note: "Screening slot for a relaxed late-night crowd.",
  },
  {
    id: "evt-12",
    name: "Drone Light Show",
    category: "Showcase",
    cost: 23,
    impact: 74,
    priority: 5,
    start: "20:00",
    end: "21:00",
    note: "Closing spectacle that boosts final attendance spikes.",
  },
];

const FESTIVAL_START = timeToMinutes("09:00");
const FESTIVAL_END = timeToMinutes("21:30");
const STAGE_LABELS = ["Stage A", "Stage B", "Stage C", "Stage D"];
const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

function timeToMinutes(timeValue) {
  const [hours, minutes] = String(timeValue).split(":").map(Number);
  return hours * 60 + minutes;
}

function minutesToTime(totalMinutes) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function durationInMinutes(event) {
  return timeToMinutes(event.end) - timeToMinutes(event.start);
}

function formatBudget(value) {
  return currencyFormatter.format(value * 1000);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => {
    const map = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };

    return map[character];
  });
}

function cloneEvents(events) {
  return events.map((event) => ({ ...event }));
}

function getPresetById(presetId) {
  return SCENARIO_PRESETS.find((preset) => preset.id === presetId) || null;
}

function uniqueValues(values) {
  return [...new Set(values)];
}

function isValidTime(value) {
  return /^\d{2}:\d{2}$/.test(String(value));
}

function createEventId() {
  return `evt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function getSortedCategories(events) {
  return uniqueValues(events.map((event) => event.category)).sort((left, right) =>
    left.localeCompare(right),
  );
}

function computeEventScore(event, priorityWeight) {
  return event.impact + event.priority * priorityWeight;
}

function computeDensity(event, priorityWeight) {
  return computeEventScore(event, priorityWeight) / event.cost;
}

function summarizeEvents(events, priorityWeight) {
  return events.reduce(
    (summary, event) => {
      summary.cost += event.cost;
      summary.impact += event.impact;
      summary.score += computeEventScore(event, priorityWeight);
      summary.minutes += durationInMinutes(event);
      return summary;
    },
    {
      count: events.length,
      cost: 0,
      impact: 0,
      score: 0,
      minutes: 0,
    },
  );
}

function normalizeEvent(event) {
  return {
    id: String(event.id || createEventId()),
    name: String(event.name || "").trim(),
    category: String(event.category || "General").trim() || "General",
    cost: clamp(Math.round(Number(event.cost) || 0), 1, 999),
    impact: clamp(Math.round(Number(event.impact) || 0), 1, 999),
    priority: clamp(Math.round(Number(event.priority) || 1), 1, 5),
    start: isValidTime(event.start) ? event.start : "09:00",
    end: isValidTime(event.end) ? event.end : "10:00",
    note: String(event.note || "").trim(),
  };
}

function buildDefaultState() {
  const events = cloneEvents(SAMPLE_EVENTS);
  return {
    events,
    settings: { ...DEFAULT_SETTINGS },
    selectedCategories: getSortedCategories(events),
    activePreset: DEFAULT_PRESET_ID,
  };
}

function loadState() {
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
          .filter(
            (event) => event.name && timeToMinutes(event.end) > timeToMinutes(event.start),
          )
      : fallback.events;
    const events = storedEvents;
    const settings = {
      budget: clamp(Number(parsed.settings?.budget) || DEFAULT_SETTINGS.budget, 40, 160),
      stageCount: clamp(Number(parsed.settings?.stageCount) || DEFAULT_SETTINGS.stageCount, 1, 4),
      priorityWeight: clamp(
        Number(parsed.settings?.priorityWeight) || DEFAULT_SETTINGS.priorityWeight,
        0,
        12,
      ),
      minPriority: clamp(
        Number(parsed.settings?.minPriority) || DEFAULT_SETTINGS.minPriority,
        1,
        5,
      ),
    };
    const categories = getSortedCategories(events);
    let selectedCategories = Array.isArray(parsed.selectedCategories)
      ? parsed.selectedCategories.filter((category) => categories.includes(category))
      : categories;

    if (categories.length > 0 && selectedCategories.length === 0) {
      selectedCategories = categories;
    }

    return {
      events,
      settings,
      selectedCategories,
      activePreset:
        typeof parsed.activePreset === "string" ? parsed.activePreset : PRESET_CUSTOM_ID,
    };
  } catch (error) {
    return fallback;
  }
}

function saveState(state) {
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

function resetState(state) {
  const fresh = buildDefaultState();
  state.events = fresh.events;
  state.settings = fresh.settings;
  state.selectedCategories = fresh.selectedCategories;
  state.activePreset = fresh.activePreset;
}

function syncSelectedCategories(state) {
  const categories = getSortedCategories(state.events);
  state.selectedCategories = state.selectedCategories.filter((category) =>
    categories.includes(category),
  );

  if (categories.length > 0 && state.selectedCategories.length === 0) {
    state.selectedCategories = categories;
  }
}

function eventMatchesFilters(event, state) {
  const categoryMatch = state.selectedCategories.includes(event.category);
  const priorityMatch = event.priority >= state.settings.minPriority;
  return categoryMatch && priorityMatch;
}

function getFilterReasons(event, state) {
  const reasons = [];

  if (!state.selectedCategories.includes(event.category)) {
    reasons.push("category not selected");
  }

  if (event.priority < state.settings.minPriority) {
    reasons.push(`priority below P${state.settings.minPriority}`);
  }

  return reasons;
}

function sortByStart(events) {
  return [...events].sort((left, right) => {
    const startDiff = timeToMinutes(left.start) - timeToMinutes(right.start);
    if (startDiff !== 0) {
      return startDiff;
    }

    return timeToMinutes(left.end) - timeToMinutes(right.end);
  });
}

function markStateCustom(state) {
  state.activePreset = PRESET_CUSTOM_ID;
}

function applyPreset(state, presetId) {
  const preset = getPresetById(presetId);
  if (!preset) {
    return;
  }

  const categories = getSortedCategories(state.events);
  state.settings = { ...preset.settings };
  state.selectedCategories = preset.categories
    ? preset.categories.filter((category) => categories.includes(category))
    : categories;

  if (categories.length > 0 && state.selectedCategories.length === 0) {
    state.selectedCategories = categories;
  }

  state.activePreset = preset.id;
}

function joinNames(events, limit = 3) {
  const names = events.slice(0, limit).map((event) => event.name);

  if (names.length === 0) {
    return "none";
  }

  if (events.length > limit) {
    return `${names.join(", ")}, and ${events.length - limit} more`;
  }

  return names.join(", ");
}

function buildSensitivitySeries(events, maxBudget, priorityWeight) {
  if (events.length === 0) {
    return [];
  }

  const budgets = [];
  for (let budget = 40; budget <= maxBudget; budget += 10) {
    budgets.push(budget);
  }

  if (!budgets.includes(maxBudget)) {
    budgets.push(maxBudget);
  }

  return budgets.map((budget) => {
    const dp = solveKnapsack(events, budget, priorityWeight);
    const greedy = solveGreedyBudget(events, budget, priorityWeight);
    return {
      budget,
      dpScore: dp.totalScore,
      greedyScore: greedy.totalScore,
      gap: dp.totalScore - greedy.totalScore,
    };
  });
}

function buildRecommendations(state, analysis) {
  const recommendations = [];
  const anchorEvents = [...analysis.weightedResult.selected].sort(
    (left, right) =>
      computeEventScore(right, state.settings.priorityWeight) -
      computeEventScore(left, state.settings.priorityWeight),
  );
  const anchorScore = anchorEvents.reduce(
    (sum, event) => sum + computeEventScore(event, state.settings.priorityWeight),
    0,
  );

  recommendations.push({
    title: "Lock your headline anchors",
    body:
      anchorEvents.length > 0
        ? `${joinNames(anchorEvents)} should stay on the premium stage path. Together they contribute ${anchorScore} score without overlap.`
        : "Increase the budget or relax filters to identify flagship events.",
  });

  const greedyBudgetIds = new Set(analysis.greedyBudgetResult.selected.map((event) => event.id));
  const dpOnlyEvents = analysis.budgetResult.selected.filter((event) => !greedyBudgetIds.has(event.id));
  recommendations.push({
    title: "Use DP for the funding decision",
    body:
      dpOnlyEvents.length > 0
        ? `The ratio heuristic misses ${joinNames(dpOnlyEvents, 2)} in the current scenario, which is why the budget DP stays ahead by ${analysis.budgetResult.totalScore - analysis.greedyBudgetResult.totalScore} points.`
        : "The greedy budget pick is close right now, but DP still guarantees the globally optimal funding set.",
  });

  const bestSensitivityPoint = analysis.sensitivity.reduce(
    (best, point) => (point.gap > best.gap ? point : best),
    { gap: Number.NEGATIVE_INFINITY, budget: 0 },
  );
  recommendations.push({
    title: "Budget tipping point",
    body:
      analysis.sensitivity.length > 0
        ? `The what-if ladder peaks at a ${bestSensitivityPoint.gap}-point gap around ${formatBudget(bestSensitivityPoint.budget)}. That is a strong budget level to show in your evaluation.`
        : "Add more active events to generate a sensitivity ladder.",
  });

  recommendations.push({
    title: "Operational note",
    body:
      analysis.stagePlan.overflow.length > 0
        ? `${analysis.stagePlan.overflow.length} funded event(s) still overflow the current lane plan. Increase stages or move ${joinNames(analysis.stagePlan.overflow, 2)} to a side venue.`
        : `The current plan fits inside ${state.settings.stageCount} stages with ${Math.round(analysis.stagePlan.utilization * 100)}% utilization, so it is operationally feasible.`,
  });

  return recommendations;
}

function buildReportMarkdown(state, analysis) {
  const preset = getPresetById(state.activePreset);
  const weightedNames = analysis.weightedResult.selected.map((event) => `- ${event.name}`).join("\n") || "- None";
  const budgetNames = analysis.budgetResult.selected.map((event) => `- ${event.name}`).join("\n") || "- None";
  const greedyBudgetNames =
    analysis.greedyBudgetResult.selected.map((event) => `- ${event.name}`).join("\n") || "- None";
  const stageLines = analysis.stagePlan.lanes
    .map(
      (lane) =>
        `- ${lane.label}: ${lane.items.length > 0 ? lane.items.map((event) => event.name).join(", ") : "No events"}`,
    )
    .join("\n");
  const recommendationLines =
    analysis.recommendations.map((item) => `- ${item.title}: ${item.body}`).join("\n") || "- None";

  return `# CampusFest Optimizer Pro Report

Generated: ${new Date().toLocaleString()}
Mode: ${preset ? preset.label : "Custom Scenario"}

## Current Settings

- Budget: ${formatBudget(state.settings.budget)}
- Stages: ${state.settings.stageCount}
- Priority weight: ${state.settings.priorityWeight}
- Minimum priority: P${state.settings.minPriority}
- Active categories: ${state.selectedCategories.join(", ") || "None"}

## Key Metrics

- Budget DP score: ${analysis.budgetResult.totalScore}
- Greedy budget score: ${analysis.greedyBudgetResult.totalScore}
- Weighted schedule score: ${analysis.weightedResult.totalScore}
- Greedy schedule score: ${analysis.greedyScheduleResult.totalScore}
- Stage overflow: ${analysis.stagePlan.overflow.length}

## Funded Lineup (Budget DP)

${budgetNames}

## Greedy Budget Lineup

${greedyBudgetNames}

## Weighted Main-Stage Lineup

${weightedNames}

## Stage Allocation

${stageLines}

## Recommendations

${recommendationLines}
`;
}

function downloadReport(state, analysis) {
  if (typeof document === "undefined" || typeof URL === "undefined") {
    return;
  }

  const blob = new Blob([buildReportMarkdown(state, analysis)], {
    type: "text/markdown;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `campusfest-optimizer-report-${Date.now()}.md`;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function setHelpOpen(ui, shouldOpen) {
  if (!ui.helpOverlay) {
    return;
  }

  ui.helpOverlay.hidden = !shouldOpen;
  ui.helpOverlay.setAttribute("aria-hidden", shouldOpen ? "false" : "true");

  if (typeof document !== "undefined") {
    document.body.classList.toggle("help-open", shouldOpen);
  }
}

function scrollToTarget(selector) {
  if (typeof document === "undefined") {
    return;
  }

  const target = document.querySelector(selector);
  if (target) {
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function buildBudgetCheckpoints(budget) {
  const checkpoints = new Set([0, budget]);
  const segments = 5;

  for (let index = 1; index < segments; index += 1) {
    checkpoints.add(Math.round((budget / segments) * index));
  }

  return [...checkpoints].sort((left, right) => left - right);
}

function solveKnapsack(events, budget, priorityWeight) {
  const itemCount = events.length;
  const table = Array.from({ length: itemCount + 1 }, () => Array(budget + 1).fill(0));

  for (let row = 1; row <= itemCount; row += 1) {
    const event = events[row - 1];
    const eventScore = computeEventScore(event, priorityWeight);

    for (let capacity = 0; capacity <= budget; capacity += 1) {
      const skip = table[row - 1][capacity];
      const take =
        event.cost <= capacity
          ? eventScore + table[row - 1][capacity - event.cost]
          : Number.NEGATIVE_INFINITY;
      table[row][capacity] = Math.max(skip, take);
    }
  }

  const selected = [];
  const decisions = [];
  const selectedIds = new Set();
  let remainingBudget = budget;

  for (let row = itemCount; row > 0; row -= 1) {
    const event = events[row - 1];
    const eventScore = computeEventScore(event, priorityWeight);
    const skip = table[row - 1][remainingBudget];
    const take =
      event.cost <= remainingBudget
        ? eventScore + table[row - 1][remainingBudget - event.cost]
        : Number.NEGATIVE_INFINITY;
    const chosen = event.cost <= remainingBudget && take >= skip && table[row][remainingBudget] === take;

    decisions.push({
      event,
      chosen,
      remainingBudget,
      resultingScore: table[row][remainingBudget],
    });

    if (chosen) {
      selected.push(event);
      selectedIds.add(event.id);
      remainingBudget -= event.cost;
    }
  }

  selected.reverse();
  decisions.reverse();

  const totals = summarizeEvents(selected, priorityWeight);

  return {
    events,
    selected,
    selectedIds,
    totalCost: totals.cost,
    totalImpact: totals.impact,
    totalScore: totals.score,
    totalMinutes: totals.minutes,
    table,
    decisions,
    checkpoints: buildBudgetCheckpoints(budget),
  };
}

function solveGreedyBudget(events, budget, priorityWeight) {
  const ranked = [...events].sort((left, right) => {
    const densityDiff = computeDensity(right, priorityWeight) - computeDensity(left, priorityWeight);
    if (densityDiff !== 0) {
      return densityDiff;
    }

    const scoreDiff = computeEventScore(right, priorityWeight) - computeEventScore(left, priorityWeight);
    if (scoreDiff !== 0) {
      return scoreDiff;
    }

    return left.cost - right.cost;
  });

  const selected = [];
  const steps = [];
  let runningCost = 0;
  let runningScore = 0;

  ranked.forEach((event, index) => {
    const eventScore = computeEventScore(event, priorityWeight);
    const nextCost = runningCost + event.cost;
    const accepted = nextCost <= budget;

    if (accepted) {
      selected.push(event);
      runningCost = nextCost;
      runningScore += eventScore;
    }

    steps.push({
      order: index + 1,
      event,
      accepted,
      runningCost,
      runningScore,
      eventScore,
      reason: accepted
        ? `Accepted because ${formatBudget(nextCost)} stays within the budget cap.`
        : `Skipped because ${formatBudget(nextCost)} would exceed the budget cap.`,
    });
  });

  const totals = summarizeEvents(selected, priorityWeight);

  return {
    selected,
    steps,
    totalCost: totals.cost,
    totalImpact: totals.impact,
    totalScore: totals.score,
    totalMinutes: totals.minutes,
  };
}

function findCompatibleIndex(sortedEvents, targetIndex) {
  const startMinutes = timeToMinutes(sortedEvents[targetIndex].start);
  let low = 0;
  let high = targetIndex - 1;
  let answer = -1;

  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    const finishMinutes = timeToMinutes(sortedEvents[middle].end);

    if (finishMinutes <= startMinutes) {
      answer = middle;
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }

  return answer;
}

function solveWeightedInterval(events, priorityWeight) {
  const sorted = [...events].sort((left, right) => {
    const finishDiff = timeToMinutes(left.end) - timeToMinutes(right.end);
    if (finishDiff !== 0) {
      return finishDiff;
    }

    return timeToMinutes(left.start) - timeToMinutes(right.start);
  });

  const count = sorted.length;
  const predecessors = sorted.map((_, index) => findCompatibleIndex(sorted, index));
  const optimal = Array(count + 1).fill(0);
  const trace = [];

  for (let index = 1; index <= count; index += 1) {
    const event = sorted[index - 1];
    const includeScore = computeEventScore(event, priorityWeight) + optimal[predecessors[index - 1] + 1];
    const excludeScore = optimal[index - 1];
    optimal[index] = Math.max(includeScore, excludeScore);

    trace.push({
      event,
      predecessor: predecessors[index - 1],
      includeScore,
      excludeScore,
      bestScore: optimal[index],
    });
  }

  const selected = [];
  const selectedIds = new Set();

  function reconstruct(pointer) {
    if (pointer === 0) {
      return;
    }

    const event = sorted[pointer - 1];
    const includeScore =
      computeEventScore(event, priorityWeight) + optimal[predecessors[pointer - 1] + 1];
    const excludeScore = optimal[pointer - 1];

    if (includeScore >= excludeScore) {
      reconstruct(predecessors[pointer - 1] + 1);
      selected.push(event);
      selectedIds.add(event.id);
    } else {
      reconstruct(pointer - 1);
    }
  }

  reconstruct(count);

  const totals = summarizeEvents(selected, priorityWeight);

  return {
    candidates: sorted,
    selected,
    selectedIds,
    predecessors,
    trace: trace.map((row) => ({
      ...row,
      chosen: selectedIds.has(row.event.id),
    })),
    totalCost: totals.cost,
    totalImpact: totals.impact,
    totalScore: totals.score,
    totalMinutes: totals.minutes,
  };
}

function solveGreedySchedule(events, priorityWeight) {
  const ordered = [...events].sort((left, right) => {
    const finishDiff = timeToMinutes(left.end) - timeToMinutes(right.end);
    if (finishDiff !== 0) {
      return finishDiff;
    }

    return timeToMinutes(left.start) - timeToMinutes(right.start);
  });

  const selected = [];
  const steps = [];
  let lastFinish = -1;
  let runningScore = 0;

  ordered.forEach((event, index) => {
    const eventStart = timeToMinutes(event.start);
    const eventFinish = timeToMinutes(event.end);
    const accepted = eventStart >= lastFinish;

    if (accepted) {
      selected.push(event);
      lastFinish = eventFinish;
      runningScore += computeEventScore(event, priorityWeight);
    }

    steps.push({
      order: index + 1,
      event,
      accepted,
      runningScore,
      reason: accepted
        ? `Accepted because it starts after the last locked finish time.`
        : `Skipped because it overlaps the current finish boundary at ${minutesToTime(lastFinish)}.`,
    });
  });

  const totals = summarizeEvents(selected, priorityWeight);

  return {
    candidates: ordered,
    selected,
    steps,
    totalCost: totals.cost,
    totalImpact: totals.impact,
    totalScore: totals.score,
    totalMinutes: totals.minutes,
  };
}

function allocateToStages(events, stageCount, priorityWeight) {
  const lanes = Array.from({ length: stageCount }, (_, index) => ({
    label: STAGE_LABELS[index],
    items: [],
    availableAt: FESTIVAL_START,
    usedMinutes: 0,
  }));
  const overflow = [];
  const ordered = sortByStart(events);

  for (const event of ordered) {
    const startMinutes = timeToMinutes(event.start);
    let bestLaneIndex = -1;
    let bestAvailability = -1;

    lanes.forEach((lane, index) => {
      if (lane.availableAt <= startMinutes && lane.availableAt >= bestAvailability) {
        bestAvailability = lane.availableAt;
        bestLaneIndex = index;
      }
    });

    if (bestLaneIndex === -1) {
      overflow.push(event);
      continue;
    }

    const lane = lanes[bestLaneIndex];
    lane.items.push({
      ...event,
      score: computeEventScore(event, priorityWeight),
    });
    lane.availableAt = timeToMinutes(event.end);
    lane.usedMinutes += durationInMinutes(event);
  }

  const totalScheduledMinutes = lanes.reduce((sum, lane) => sum + lane.usedMinutes, 0);

  return {
    lanes,
    overflow,
    totalScheduledMinutes,
    scheduledCount: lanes.reduce((sum, lane) => sum + lane.items.length, 0),
    utilization:
      stageCount > 0
        ? totalScheduledMinutes / (stageCount * (FESTIVAL_END - FESTIVAL_START))
        : 0,
  };
}

function computeAnalysis(state) {
  const activeEvents = sortByStart(state.events.filter((event) => eventMatchesFilters(event, state)));
  const priorityWeight = state.settings.priorityWeight;
  const budgetResult = solveKnapsack(activeEvents, state.settings.budget, priorityWeight);
  const greedyBudgetResult = solveGreedyBudget(activeEvents, state.settings.budget, priorityWeight);
  const weightedResult = solveWeightedInterval(budgetResult.selected, priorityWeight);
  const greedyScheduleResult = solveGreedySchedule(budgetResult.selected, priorityWeight);
  const stagePlan = allocateToStages(budgetResult.selected, state.settings.stageCount, priorityWeight);
  const sensitivity = buildSensitivitySeries(activeEvents, state.settings.budget, priorityWeight);
  const barData = [
    {
      label: "Budget DP",
      subtitle: "Optimal funded lineup",
      value: budgetResult.totalScore,
      variant: "dp",
      valueLabel: `${budgetResult.totalScore} pts`,
    },
    {
      label: "Ratio Greedy",
      subtitle: "Fast budget heuristic",
      value: greedyBudgetResult.totalScore,
      variant: "greedy",
      valueLabel: `${greedyBudgetResult.totalScore} pts`,
    },
    {
      label: "WIS DP",
      subtitle: "Best single-stage value",
      value: weightedResult.totalScore,
      variant: "wis",
      valueLabel: `${weightedResult.totalScore} pts`,
    },
    {
      label: "Finish-Time Greedy",
      subtitle: "Single-stage baseline",
      value: greedyScheduleResult.totalScore,
      variant: "schedule",
      valueLabel: `${greedyScheduleResult.totalScore} pts`,
    },
  ];
  const stats = [
    {
      label: "Active Proposals",
      value: `${activeEvents.length}/${state.events.length}`,
      subtext: "After current filters",
    },
    {
      label: "Funded Score",
      value: String(budgetResult.totalScore),
      subtext: `${budgetResult.selected.length} proposals funded`,
    },
    {
      label: "Budget Gap",
      value: String(budgetResult.totalScore - greedyBudgetResult.totalScore),
      subtext: "DP minus greedy score",
    },
    {
      label: "Schedule Gap",
      value: String(weightedResult.totalScore - greedyScheduleResult.totalScore),
      subtext: "WIS minus finish-time score",
    },
    {
      label: "Stage Utilization",
      value: `${Math.round(stagePlan.utilization * 100)}%`,
      subtext: `${state.settings.stageCount} stages available`,
    },
    {
      label: "Overflow Events",
      value: String(stagePlan.overflow.length),
      subtext: "Funded but not placed on lanes",
    },
  ];
  const insights = [
    {
      title: `+${budgetResult.totalScore - greedyBudgetResult.totalScore} budget score`,
      body: "Knapsack explores combinations that the ratio heuristic misses.",
    },
    {
      title: `+${weightedResult.totalScore - greedyScheduleResult.totalScore} schedule score`,
      body: "Weighted interval scheduling optimizes value, not just event count.",
    },
    {
      title: `${stagePlan.scheduledCount} lane assignments`,
      body:
        stagePlan.overflow.length === 0
          ? "Every funded event fits across the current stage count."
          : `${stagePlan.overflow.length} funded event(s) still overflow the current lane capacity.`,
    },
  ];
  const recommendations = buildRecommendations(state, {
    activeEvents,
    budgetResult,
    greedyBudgetResult,
    weightedResult,
    greedyScheduleResult,
    stagePlan,
    sensitivity,
  });

  return {
    activeEvents,
    budgetResult,
    greedyBudgetResult,
    weightedResult,
    greedyScheduleResult,
    stagePlan,
    barData,
    stats,
    insights,
    sensitivity,
    recommendations,
  };
}

function createStatsMarkup(stats) {
  return stats
    .map(
      (stat) => `
        <article class="stat-card">
          <p class="stat-label">${escapeHtml(stat.label)}</p>
          <p class="stat-value">${escapeHtml(stat.value)}</p>
          <p class="stat-subtext">${escapeHtml(stat.subtext)}</p>
        </article>
      `,
    )
    .join("");
}

function createCategoryFiltersMarkup(categories, selectedCategories) {
  if (categories.length === 0) {
    return '<div class="empty-state">Add an event to create category filters.</div>';
  }

  return categories
    .map((category) => {
      const selected = selectedCategories.includes(category);
      return `
        <label class="chip ${selected ? "selected" : ""}">
          <input type="checkbox" data-category="${escapeHtml(category)}" ${selected ? "checked" : ""}>
          ${escapeHtml(category)}
        </label>
      `;
    })
    .join("");
}

function createCategoryOptionMarkup(categories) {
  return categories
    .map((category) => `<option value="${escapeHtml(category)}"></option>`)
    .join("");
}

function createEventMarkup(events, state) {
  if (events.length === 0) {
    return '<div class="empty-state">No proposals in the scenario yet. Add one to start optimizing.</div>';
  }

  return events
    .map((event) => {
      const active = eventMatchesFilters(event, state);
      const reasons = getFilterReasons(event, state);
      const score = computeEventScore(event, state.settings.priorityWeight);
      const density = computeDensity(event, state.settings.priorityWeight).toFixed(2);
      const statusText = active ? "In model" : "Filtered";
      const subtitle = active
        ? "Included in the optimizer input."
        : `Filtered: ${reasons.join(", ")}.`;

      return `
        <article class="event-card ${active ? "" : "inactive"}">
          <div class="event-top">
            <div>
              <div class="event-name">${escapeHtml(event.name)}</div>
              <div class="muted-note">${escapeHtml(event.start)} - ${escapeHtml(event.end)}</div>
            </div>
            <button class="remove-btn" type="button" data-remove-id="${escapeHtml(event.id)}">Remove</button>
          </div>
          <span class="event-status ${active ? "active" : "inactive"}">${escapeHtml(statusText)}</span>
          <div class="badge-row">
            <span class="pill"><strong>${escapeHtml(event.category)}</strong></span>
            <span class="pill">Priority <strong>P${event.priority}</strong></span>
            <span class="pill">Cost <strong>${formatBudget(event.cost)}</strong></span>
            <span class="pill">Impact <strong>${event.impact}</strong></span>
            <span class="pill">Score <strong>${score}</strong></span>
            <span class="pill">Density <strong>${density}</strong></span>
          </div>
          <p class="selection-subtext">${escapeHtml(event.note || subtitle)}</p>
        </article>
      `;
    })
    .join("");
}

function createSelectionMarkup(events, priorityWeight, variant, emptyText) {
  if (events.length === 0) {
    return `<div class="empty-state">${escapeHtml(emptyText)}</div>`;
  }

  return events
    .map((event) => {
      const score = computeEventScore(event, priorityWeight);
      return `
        <article class="selection-card ${variant}">
          <div class="selection-top">
            <div class="selection-name">${escapeHtml(event.name)}</div>
            <strong>${score} pts</strong>
          </div>
          <div class="selection-meta">
            <span class="pill"><strong>${escapeHtml(event.category)}</strong></span>
            <span class="pill">${formatBudget(event.cost)}</span>
            <span class="pill">P${event.priority}</span>
            <span class="pill">${escapeHtml(event.start)} - ${escapeHtml(event.end)}</span>
          </div>
          <p class="selection-subtext">${escapeHtml(event.note)}</p>
        </article>
      `;
    })
    .join("");
}

function createComparisonBarsMarkup(barData) {
  const maxValue = Math.max(...barData.map((item) => item.value), 1);

  return barData
    .map((item) => {
      const width = item.value > 0 ? Math.max((item.value / maxValue) * 100, 6) : 0;

      return `
        <div class="bar-row">
          <div class="bar-labels">
            <strong>${escapeHtml(item.label)}</strong>
            <span>${escapeHtml(item.subtitle)}</span>
          </div>
          <div class="bar-track">
            <div class="bar-fill ${escapeHtml(item.variant)}" style="width: ${width}%;"></div>
          </div>
          <div class="bar-value">${escapeHtml(item.valueLabel)}</div>
        </div>
      `;
    })
    .join("");
}

function createInsightsMarkup(insights) {
  return insights
    .map(
      (item) => `
        <article class="insight-card">
          <strong>${escapeHtml(item.title)}</strong>
          <p>${escapeHtml(item.body)}</p>
        </article>
      `,
    )
    .join("");
}

function createPresetMarkup(activePreset) {
  return SCENARIO_PRESETS.map(
    (preset) => `
      <button
        class="preset-btn ${activePreset === preset.id ? "active" : ""}"
        type="button"
        data-preset-id="${escapeHtml(preset.id)}"
      >
        <strong>${escapeHtml(preset.label)}</strong>
        <span>${escapeHtml(preset.description)}</span>
      </button>
    `,
  ).join("");
}

function createSensitivityMarkup(series, currentBudget) {
  if (series.length === 0) {
    return '<div class="empty-state">Add or enable some events to generate a budget sensitivity view.</div>';
  }

  const maxScore = Math.max(
    ...series.flatMap((point) => [point.dpScore, point.greedyScore]),
    1,
  );

  return series
    .map((point) => {
      const dpWidth = Math.max((point.dpScore / maxScore) * 100, point.dpScore > 0 ? 4 : 0);
      const greedyWidth = Math.max(
        (point.greedyScore / maxScore) * 100,
        point.greedyScore > 0 ? 4 : 0,
      );
      return `
        <div class="sensitivity-row ${point.budget === currentBudget ? "current" : ""}">
          <div class="sensitivity-budget">${formatBudget(point.budget)}</div>
          <div class="sensitivity-bars">
            <div class="sensitivity-track">
              <div class="sensitivity-fill dp" style="width: ${dpWidth}%;"></div>
            </div>
            <div class="sensitivity-track">
              <div class="sensitivity-fill greedy" style="width: ${greedyWidth}%;"></div>
            </div>
          </div>
          <div class="sensitivity-values">DP ${point.dpScore}<br>G ${point.greedyScore} | gap ${point.gap}</div>
        </div>
      `;
    })
    .join("");
}

function createRecommendationsMarkup(recommendations) {
  return recommendations
    .map(
      (item) => `
        <article class="recommendation-card">
          <strong>${escapeHtml(item.title)}</strong>
          <p>${escapeHtml(item.body)}</p>
        </article>
      `,
    )
    .join("");
}

function getEventPosition(event) {
  const totalMinutes = FESTIVAL_END - FESTIVAL_START;
  const startOffset = timeToMinutes(event.start) - FESTIVAL_START;
  const duration = durationInMinutes(event);
  const left = (startOffset / totalMinutes) * 100;
  const rawWidth = (duration / totalMinutes) * 100;
  const width = Math.min(Math.max(rawWidth, 7), Math.max(2, 100 - left));

  return {
    left,
    width,
  };
}

function createStagePlanMarkup(stagePlan) {
  return stagePlan.lanes
    .map((lane, index) => {
      const blocks = lane.items
        .map((event) => {
          const position = getEventPosition(event);
          return `
            <div
              class="stage-block stage-${index}"
              style="left: ${position.left}%; width: ${position.width}%;"
              title="${escapeHtml(`${event.name} (${event.start}-${event.end}) score ${event.score}`)}"
            >
              ${escapeHtml(event.name)}
            </div>
          `;
        })
        .join("");

      return `
        <div class="stage-lane">
          <div class="stage-label">${escapeHtml(lane.label)}</div>
          <div class="stage-track ${lane.items.length === 0 ? "empty" : ""}">
            ${blocks}
          </div>
        </div>
      `;
    })
    .join("");
}

function createOverflowMarkup(stagePlan) {
  if (stagePlan.overflow.length === 0) {
    return '<div class="overflow-ok">All funded events fit into the available stage lanes.</div>';
  }

  const items = stagePlan.overflow
    .map(
      (event) => `
        <span class="overflow-pill">${escapeHtml(event.name)} (${escapeHtml(event.start)} - ${escapeHtml(event.end)})</span>
      `,
    )
    .join("");

  return `<div class="overflow-list">${items}</div>`;
}

function createKnapsackTableMarkup(result, priorityWeight) {
  if (result.events.length === 0) {
    return '<div class="empty-state">No active proposals are available for knapsack optimization.</div>';
  }

  const header = result.checkpoints
    .map((checkpoint) => `<th>B=${checkpoint}</th>`)
    .join("");
  const rows = result.events
    .map((event, index) => {
      const cells = result.checkpoints
        .map((checkpoint) => `<td>${result.table[index + 1][checkpoint]}</td>`)
        .join("");

      return `
        <tr class="${result.selectedIds.has(event.id) ? "highlight" : ""}">
          <td>${escapeHtml(event.name)}</td>
          <td>${computeEventScore(event, priorityWeight)}</td>
          ${cells}
        </tr>
      `;
    })
    .join("");
  const totalRow = result.checkpoints
    .map((checkpoint) => `<td>${result.table[result.events.length][checkpoint]}</td>`)
    .join("");

  return `
    <table class="trace-table">
      <thead>
        <tr>
          <th>Event</th>
          <th>Score</th>
          ${header}
        </tr>
      </thead>
      <tbody>
        ${rows}
        <tr class="highlight">
          <td>OPT</td>
          <td>Final</td>
          ${totalRow}
        </tr>
      </tbody>
    </table>
  `;
}

function createWeightedTraceMarkup(result) {
  if (result.candidates.length === 0) {
    return '<div class="empty-state">Fund at least one event before main-stage scheduling can run.</div>';
  }

  const rows = result.trace
    .map((row) => `
      <tr class="${row.chosen ? "highlight" : ""}">
        <td>${escapeHtml(row.event.name)}</td>
        <td>${escapeHtml(row.event.start)} - ${escapeHtml(row.event.end)}</td>
        <td>${row.predecessor >= 0 ? row.predecessor + 1 : 0}</td>
        <td>${row.includeScore}</td>
        <td>${row.excludeScore}</td>
        <td>${row.bestScore}</td>
        <td>${row.chosen ? "Take" : "Skip"}</td>
      </tr>
    `)
    .join("");

  return `
    <table class="trace-table">
      <thead>
        <tr>
          <th>Event</th>
          <th>Window</th>
          <th>p(j)</th>
          <th>Include</th>
          <th>Exclude</th>
          <th>OPT</th>
          <th>Decision</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function createStepColumnMarkup(title, steps, priorityWeight, emptyText) {
  if (steps.length === 0) {
    return `
      <div class="step-group">
        <h3>${escapeHtml(title)}</h3>
        <div class="empty-state">${escapeHtml(emptyText)}</div>
      </div>
    `;
  }

  const cards = steps
    .map((step) => `
      <article class="step-card">
        <div class="step-top">
          <strong>${step.order}. ${escapeHtml(step.event.name)}</strong>
          <span class="step-badge ${step.accepted ? "take" : "skip"}">${step.accepted ? "TAKE" : "SKIP"}</span>
        </div>
        <p class="step-meta">
          Score ${computeEventScore(step.event, priorityWeight)}, cost ${formatBudget(step.event.cost)}.
          ${escapeHtml(step.reason)}
        </p>
      </article>
    `)
    .join("");

  return `
    <div class="step-group">
      <h3>${escapeHtml(title)}</h3>
      ${cards}
    </div>
  `;
}

function createGreedyStepsMarkup(greedyBudgetResult, greedyScheduleResult, priorityWeight) {
  return `
    ${createStepColumnMarkup(
      "Budget heuristic",
      greedyBudgetResult.steps,
      priorityWeight,
      "No greedy budget steps available yet.",
    )}
    ${createStepColumnMarkup(
      "Schedule heuristic",
      greedyScheduleResult.steps,
      priorityWeight,
      "No greedy schedule steps available yet.",
    )}
  `;
}

function renderDashboard(state, ui) {
  syncSelectedCategories(state);
  const categories = getSortedCategories(state.events);
  const analysis = computeAnalysis(state);
  state.lastAnalysis = analysis;
  const priorityWeight = state.settings.priorityWeight;
  const allEvents = sortByStart(state.events);
  const budgetGap = analysis.budgetResult.totalScore - analysis.greedyBudgetResult.totalScore;
  const scheduleGap = analysis.weightedResult.totalScore - analysis.greedyScheduleResult.totalScore;
  const currentPreset = getPresetById(state.activePreset);
  const bestSensitivityPoint = analysis.sensitivity.reduce(
    (best, point) => (point.gap > best.gap ? point : best),
    { gap: Number.NEGATIVE_INFINITY, budget: state.settings.budget },
  );

  ui.statsGrid.innerHTML = createStatsMarkup(analysis.stats);
  ui.presetButtons.innerHTML = createPresetMarkup(state.activePreset);
  ui.presetCaption.textContent = currentPreset
    ? `${currentPreset.label}: ${currentPreset.description}`
    : "Custom scenario: current settings differ from any preset.";
  ui.categoryFilters.innerHTML = createCategoryFiltersMarkup(categories, state.selectedCategories);
  ui.categoryOptions.innerHTML = createCategoryOptionMarkup(categories);
  ui.eventsGrid.innerHTML = createEventMarkup(allEvents, state);

  ui.budgetDpList.innerHTML = createSelectionMarkup(
    analysis.budgetResult.selected,
    priorityWeight,
    "dp",
    "No funded lineup yet. Increase the budget or relax the filters.",
  );
  ui.greedyBudgetList.innerHTML = createSelectionMarkup(
    analysis.greedyBudgetResult.selected,
    priorityWeight,
    "greedy",
    "Greedy budget selection is empty under the current settings.",
  );
  ui.weightedList.innerHTML = createSelectionMarkup(
    analysis.weightedResult.selected,
    priorityWeight,
    "wis",
    "Fund events first to unlock weighted interval scheduling.",
  );
  ui.greedyScheduleList.innerHTML = createSelectionMarkup(
    analysis.greedyScheduleResult.selected,
    priorityWeight,
    "schedule",
    "Fund events first to run the greedy schedule baseline.",
  );

  ui.budgetDpSummary.textContent = `${analysis.budgetResult.selected.length} events | ${formatBudget(analysis.budgetResult.totalCost)} spent | score ${analysis.budgetResult.totalScore}`;
  ui.greedyBudgetSummary.textContent = `${analysis.greedyBudgetResult.selected.length} events | gap ${budgetGap} vs DP`;
  ui.weightedSummary.textContent = `${analysis.weightedResult.selected.length} events | ${analysis.weightedResult.totalMinutes} min | score ${analysis.weightedResult.totalScore}`;
  ui.greedyScheduleSummary.textContent = `${analysis.greedyScheduleResult.selected.length} events | gap ${scheduleGap} vs WIS`;

  ui.comparisonBars.innerHTML = createComparisonBarsMarkup(analysis.barData);
  ui.comparisonInsights.innerHTML = createInsightsMarkup(analysis.insights);

  ui.stagePlan.innerHTML = createStagePlanMarkup(analysis.stagePlan);
  ui.overflowEvents.innerHTML = createOverflowMarkup(analysis.stagePlan);
  ui.stagePlanSummary.textContent = `${state.settings.stageCount} stages | ${analysis.stagePlan.scheduledCount} placed | ${analysis.stagePlan.overflow.length} overflow`;

  ui.knapsackTraceSummary.textContent = `Checkpoints sampled across budget ${formatBudget(state.settings.budget)}. Highlighted rows are chosen by reconstruction.`;
  ui.knapsackTable.innerHTML = createKnapsackTableMarkup(analysis.budgetResult, priorityWeight);

  ui.weightedTraceSummary.textContent = "p(j) is the rightmost compatible predecessor for each event in finish-time order.";
  ui.weightedTable.innerHTML = createWeightedTraceMarkup(analysis.weightedResult);

  ui.greedySteps.innerHTML = createGreedyStepsMarkup(
    analysis.greedyBudgetResult,
    analysis.greedyScheduleResult,
    priorityWeight,
  );
  ui.sensitivitySummary.textContent =
    analysis.sensitivity.length > 0
      ? `Peak sampled gap: ${bestSensitivityPoint.gap} points at ${formatBudget(bestSensitivityPoint.budget)}`
      : "No active events available for budget sensitivity analysis.";
  ui.sensitivityChart.innerHTML = createSensitivityMarkup(
    analysis.sensitivity,
    state.settings.budget,
  );
  ui.recommendationGrid.innerHTML = createRecommendationsMarkup(analysis.recommendations);

  saveState(state);
}

function syncControls(state, ui) {
  ui.budgetSlider.value = state.settings.budget;
  ui.budgetInput.value = state.settings.budget;
  ui.stagesSelect.value = String(state.settings.stageCount);
  ui.prioritySlider.value = state.settings.priorityWeight;
  ui.priorityInput.value = state.settings.priorityWeight;
  ui.minPriority.value = String(state.settings.minPriority);
}

function attachApp() {
  const state = loadState();
  const ui = {
    statsGrid: document.getElementById("stats-grid"),
    budgetSlider: document.getElementById("budget-slider"),
    budgetInput: document.getElementById("budget-input"),
    stagesSelect: document.getElementById("stages-select"),
    prioritySlider: document.getElementById("priority-slider"),
    priorityInput: document.getElementById("priority-input"),
    minPriority: document.getElementById("min-priority"),
    runOptimizer: document.getElementById("run-optimizer"),
    resetEvents: document.getElementById("reset-events"),
    clearStorage: document.getElementById("clear-storage"),
    exportReport: document.getElementById("export-report"),
    openHelp: document.getElementById("open-help"),
    openHelpInline: document.getElementById("open-help-inline"),
    openHelpFab: document.getElementById("open-help-fab"),
    closeHelp: document.getElementById("close-help"),
    helpOverlay: document.getElementById("help-overlay"),
    presetButtons: document.getElementById("preset-buttons"),
    presetCaption: document.getElementById("preset-caption"),
    categoryFilters: document.getElementById("category-filters"),
    categoryOptions: document.getElementById("category-options"),
    eventForm: document.getElementById("event-form"),
    eventsGrid: document.getElementById("events-grid"),
    budgetDpList: document.getElementById("budget-dp-list"),
    greedyBudgetList: document.getElementById("greedy-budget-list"),
    weightedList: document.getElementById("weighted-list"),
    greedyScheduleList: document.getElementById("greedy-schedule-list"),
    budgetDpSummary: document.getElementById("budget-dp-summary"),
    greedyBudgetSummary: document.getElementById("greedy-budget-summary"),
    weightedSummary: document.getElementById("weighted-summary"),
    greedyScheduleSummary: document.getElementById("greedy-schedule-summary"),
    comparisonBars: document.getElementById("comparison-bars"),
    comparisonInsights: document.getElementById("comparison-insights"),
    stagePlan: document.getElementById("stage-plan"),
    stagePlanSummary: document.getElementById("stage-plan-summary"),
    overflowEvents: document.getElementById("overflow-events"),
    knapsackTraceSummary: document.getElementById("knapsack-trace-summary"),
    knapsackTable: document.getElementById("knapsack-table"),
    weightedTraceSummary: document.getElementById("weighted-trace-summary"),
    weightedTable: document.getElementById("weighted-table"),
    greedySteps: document.getElementById("greedy-steps"),
    sensitivitySummary: document.getElementById("sensitivity-summary"),
    sensitivityChart: document.getElementById("sensitivity-chart"),
    recommendationGrid: document.getElementById("recommendation-grid"),
  };

  function redraw() {
    syncControls(state, ui);
    renderDashboard(state, ui);
  }

  function updateBudget(value) {
    state.settings.budget = clamp(Number(value) || DEFAULT_SETTINGS.budget, 40, 160);
    markStateCustom(state);
    redraw();
  }

  function updatePriorityWeight(value) {
    state.settings.priorityWeight = clamp(Number(value) || 0, 0, 12);
    markStateCustom(state);
    redraw();
  }

  redraw();

  ui.budgetSlider.addEventListener("input", (event) => updateBudget(event.target.value));
  ui.budgetInput.addEventListener("input", (event) => updateBudget(event.target.value));

  ui.prioritySlider.addEventListener("input", (event) => updatePriorityWeight(event.target.value));
  ui.priorityInput.addEventListener("input", (event) => updatePriorityWeight(event.target.value));

  ui.stagesSelect.addEventListener("change", (event) => {
    state.settings.stageCount = clamp(Number(event.target.value) || 1, 1, 4);
    markStateCustom(state);
    redraw();
  });

  ui.minPriority.addEventListener("change", (event) => {
    state.settings.minPriority = clamp(Number(event.target.value) || 1, 1, 5);
    markStateCustom(state);
    redraw();
  });

  ui.runOptimizer.addEventListener("click", () => {
    redraw();
  });

  ui.resetEvents.addEventListener("click", () => {
    resetState(state);
    redraw();
  });

  ui.clearStorage.addEventListener("click", () => {
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem(STORAGE_KEY);
    }
    resetState(state);
    redraw();
  });

  ui.exportReport.addEventListener("click", () => {
    downloadReport(state, state.lastAnalysis || computeAnalysis(state));
  });

  [ui.openHelp, ui.openHelpInline, ui.openHelpFab].forEach((button) => {
    if (!button) {
      return;
    }

    button.addEventListener("click", () => {
      setHelpOpen(ui, true);
    });
  });

  if (ui.closeHelp) {
    ui.closeHelp.addEventListener("click", () => {
      setHelpOpen(ui, false);
    });
  }

  if (ui.helpOverlay) {
    ui.helpOverlay.addEventListener("click", (event) => {
      if (event.target === ui.helpOverlay) {
        setHelpOpen(ui, false);
        return;
      }

      const jumpButton = event.target.closest("[data-scroll-target]");
      if (jumpButton) {
        setHelpOpen(ui, false);
        scrollToTarget(jumpButton.dataset.scrollTarget);
      }
    });
  }

  if (typeof document !== "undefined") {
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && ui.helpOverlay && !ui.helpOverlay.hidden) {
        setHelpOpen(ui, false);
      }
    });
  }

  ui.presetButtons.addEventListener("click", (event) => {
    const button = event.target.closest("[data-preset-id]");
    if (!button) {
      return;
    }

    applyPreset(state, button.dataset.presetId);
    redraw();
  });

  ui.categoryFilters.addEventListener("change", (event) => {
    const input = event.target.closest("[data-category]");
    if (!input) {
      return;
    }

    const category = input.dataset.category;
    if (input.checked) {
      if (!state.selectedCategories.includes(category)) {
        state.selectedCategories = [...state.selectedCategories, category].sort((left, right) =>
          left.localeCompare(right),
        );
      }
    } else {
      state.selectedCategories = state.selectedCategories.filter((item) => item !== category);
    }

    markStateCustom(state);
    redraw();
  });

  ui.eventForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const candidate = normalizeEvent({
      id: createEventId(),
      name: document.getElementById("event-name").value,
      category: document.getElementById("event-category").value,
      cost: document.getElementById("event-cost").value,
      impact: document.getElementById("event-impact").value,
      priority: document.getElementById("event-priority").value,
      start: document.getElementById("event-start").value,
      end: document.getElementById("event-end").value,
      note: document.getElementById("event-note").value || "Custom proposal added by the planner.",
    });

    if (!candidate.name) {
      window.alert("Please enter an event name.");
      return;
    }

    if (timeToMinutes(candidate.end) <= timeToMinutes(candidate.start)) {
      window.alert("End time must be later than start time.");
      return;
    }

    state.events = [...state.events, candidate];
    if (!state.selectedCategories.includes(candidate.category)) {
      state.selectedCategories = [...state.selectedCategories, candidate.category].sort((left, right) =>
        left.localeCompare(right),
      );
    }
    markStateCustom(state);

    ui.eventForm.reset();
    document.getElementById("event-cost").value = "15";
    document.getElementById("event-impact").value = "40";
    document.getElementById("event-priority").value = "3";
    document.getElementById("event-start").value = "13:00";
    document.getElementById("event-end").value = "14:00";
    redraw();
  });

  ui.eventsGrid.addEventListener("click", (event) => {
    const button = event.target.closest("[data-remove-id]");
    if (!button) {
      return;
    }

    state.events = state.events.filter((item) => item.id !== button.dataset.removeId);
    syncSelectedCategories(state);
    markStateCustom(state);
    redraw();
  });

  document.querySelectorAll(".help-jump-btn").forEach((button) => {
    button.addEventListener("click", () => {
      scrollToTarget(button.dataset.scrollTarget);
    });
  });
}

if (typeof document !== "undefined") {
  document.addEventListener("DOMContentLoaded", attachApp);
}

if (typeof module !== "undefined") {
  module.exports = {
    SAMPLE_EVENTS,
    DEFAULT_SETTINGS,
    SCENARIO_PRESETS,
    computeEventScore,
    buildSensitivitySeries,
    solveKnapsack,
    solveGreedyBudget,
    solveWeightedInterval,
    solveGreedySchedule,
    allocateToStages,
    timeToMinutes,
    minutesToTime,
    durationInMinutes,
  };
}
