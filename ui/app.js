import {
  DEFAULT_SETTINGS,
  PRESET_CUSTOM_ID,
  SCENARIO_PRESETS,
  STORAGE_KEY,
} from "../models/config.js";
import { createEventId, normalizeEvent } from "../models/events.js";
import { computeAnalysis, eventMatchesFilters, getFilterReasons } from "../algorithms/analysis.js";
import {
  computeAdvancedDensity,
  computePredictedScore,
  computeTrendFactor,
} from "../algorithms/scoring.js";
import {
  createBudgetTraceMarkup,
  createCategoryFiltersMarkup,
  createCategoryOptionMarkup,
  createComparisonBarsMarkup,
  createEventMarkup,
  createGreedyStepsMarkup,
  createInsightsMarkup,
  createOverflowMarkup,
  createPresetMarkup,
  createRecommendationsMarkup,
  createSelectionMarkup,
  createSensitivityMarkup,
  createStagePlanMarkup,
  createStatsMarkup,
  createWhatIfMarkup,
  createWeightedTraceMarkup,
} from "./templates.js";
import { formatBudget } from "../utils/format.js";
import { clamp, getSortedCategories, joinNames, sortByStart } from "../utils/helpers.js";
import { buildDefaultState, loadState, resetState, saveState, syncSelectedCategories } from "../utils/storage.js";
import { timeToMinutes } from "../utils/time.js";

function getPresetById(presetId) {
  return SCENARIO_PRESETS.find((preset) => preset.id === presetId) || null;
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

function buildReportMarkdown(state, analysis) {
  const preset = getPresetById(state.activePreset);
  const budgetNames =
    analysis.budgetResult.selected.map((event) => `- ${event.name}`).join("\n") || "- None";
  const greedyBudgetNames =
    analysis.greedyBudgetResult.selected.map((event) => `- ${event.name}`).join("\n") || "- None";
  const multiStageNames =
    analysis.stagePlan.selected.map((event) => `- ${event.name}`).join("\n") || "- None";
  const weightedNames =
    analysis.weightedResult.selected.map((event) => `- ${event.name}`).join("\n") || "- None";
  const overflowNotes =
    analysis.stagePlan.overflowSuggestions
      .map((item) => `- ${item.event.name}: ${item.suggestions.join(" ")}`)
      .join("\n") || "- None";
  const recommendationLines =
    analysis.recommendations.map((item) => `- ${item.title}: ${item.body}`).join("\n") || "- None";

  return `# CampusFest Optimizer Pro Report

Generated: ${new Date().toLocaleString()}
Mode: ${preset ? preset.label : "Custom Scenario"}

## Resource Envelope

- Budget: ${formatBudget(state.settings.budget)}
- Staff limit: ${state.settings.staffLimit}
- Equipment limit: ${state.settings.equipmentLimit}
- Stage count: ${state.settings.stageCount}
- Priority weight: ${state.settings.priorityWeight}
- Minimum priority: P${state.settings.minPriority}

## Core Outcomes

- Hybrid DP funding score: ${analysis.budgetResult.totalScore}
- Advanced greedy seed score: ${analysis.greedyBudgetResult.totalScore}
- Multi-stage optimized score: ${analysis.stagePlan.totalScore}
- Single-stage weighted interval score: ${analysis.weightedResult.totalScore}
- Greedy schedule score: ${analysis.greedyScheduleResult.totalScore}

## Hybrid DP Funded Lineup

${budgetNames}

## Advanced Greedy Seed

${greedyBudgetNames}

## Multi-Stage Optimized Schedule

${multiStageNames}

## Weighted Interval Reference

${weightedNames}

## Deferred / Overflow Suggestions

${overflowNotes}

## What-If Strategy

- ${analysis.whatIf.bestNarrative}

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

function buildEventViewModels(state) {
  return sortByStart(state.events).map((event) => ({
    ...event,
    active: eventMatchesFilters(event, state),
    reasons: getFilterReasons(event, state),
    predictedScore: computePredictedScore(event, state.settings),
    trendFactor: computeTrendFactor(event, state.settings),
    density: computeAdvancedDensity(event, state.settings),
  }));
}

function renderDashboard(state, ui) {
  syncSelectedCategories(state);
  const categories = getSortedCategories(state.events);
  const analysis = computeAnalysis(state);
  const allEvents = buildEventViewModels(state);
  const currentPreset = getPresetById(state.activePreset);
  const bestSensitivityPoint = analysis.sensitivity.reduce(
    (best, point) => (point.gap > best.gap ? point : best),
    { gap: Number.NEGATIVE_INFINITY, budget: state.settings.budget },
  );

  state.lastAnalysis = analysis;

  ui.statsGrid.innerHTML = createStatsMarkup(analysis.stats);
  ui.presetButtons.innerHTML = createPresetMarkup(state.activePreset);
  ui.presetCaption.textContent = currentPreset
    ? `${currentPreset.label}: ${currentPreset.description}`
    : "Custom scenario: current settings differ from any preset.";
  ui.categoryFilters.innerHTML = createCategoryFiltersMarkup(categories, state.selectedCategories);
  ui.categoryOptions.innerHTML = createCategoryOptionMarkup(categories);
  ui.eventsGrid.innerHTML = createEventMarkup(allEvents);

  ui.budgetDpList.innerHTML = createSelectionMarkup(
    analysis.budgetResult.selected,
    state.settings,
    "dp",
    "No funded lineup yet. Increase one of the resource caps or relax the filters.",
  );
  ui.greedyBudgetList.innerHTML = createSelectionMarkup(
    analysis.greedyBudgetResult.selected,
    state.settings,
    "greedy",
    "Advanced greedy could not build a feasible lineup under the current caps.",
  );
  ui.weightedList.innerHTML = createSelectionMarkup(
    analysis.stagePlan.selected,
    state.settings,
    "wis",
    "Fund events first to unlock the multi-stage optimizer.",
  );
  ui.greedyScheduleList.innerHTML = createSelectionMarkup(
    analysis.greedyScheduleResult.selected,
    state.settings,
    "schedule",
    "Fund events first to run the greedy scheduling baseline.",
  );

  ui.budgetDpSummary.textContent =
    `${analysis.budgetResult.selected.length} events | ${formatBudget(analysis.budgetResult.totalCost)} | staff ${analysis.budgetResult.totalStaff} | equip ${analysis.budgetResult.totalEquipment} | score ${analysis.budgetResult.totalScore}`;
  ui.greedyBudgetSummary.textContent =
    `${analysis.greedyBudgetResult.selected.length} events | hybrid gain ${analysis.budgetResult.hybridGain} vs seed`;
  ui.weightedSummary.textContent =
    `${analysis.stagePlan.selected.length} scheduled | ${analysis.stagePlan.totalMinutes} min | idle ${analysis.stagePlan.totalIdleMinutes} min | score ${analysis.stagePlan.totalScore}`;
  ui.greedyScheduleSummary.textContent =
    `${analysis.greedyScheduleResult.selected.length} events | gap ${analysis.stagePlan.totalScore - analysis.greedyScheduleResult.totalScore} vs multi-stage`;

  ui.comparisonBars.innerHTML = createComparisonBarsMarkup(analysis.barData);
  ui.comparisonInsights.innerHTML = createInsightsMarkup(analysis.insights);

  ui.stagePlan.innerHTML = createStagePlanMarkup(analysis.stagePlan);
  ui.overflowEvents.innerHTML = createOverflowMarkup(analysis.stagePlan);
  ui.stagePlanSummary.textContent =
    `${state.settings.stageCount} stages | ${analysis.stagePlan.scheduledCount} scheduled | ${analysis.stagePlan.overflow.length} deferred`;

  ui.knapsackTraceSummary.textContent = analysis.budgetResult.scaledScenario.approximate
    ? "Adaptive scaling is active to keep the 3D DP fast for larger scenarios."
    : "Exact 3D DP is active across budget, staff, and equipment.";
  ui.knapsackTable.innerHTML = createBudgetTraceMarkup(analysis.budgetResult);

  ui.weightedTraceSummary.textContent =
    "Single-stage weighted interval scheduling remains as an explainable reference baseline.";
  ui.weightedTable.innerHTML = createWeightedTraceMarkup(analysis.weightedResult);

  ui.greedySteps.innerHTML = createGreedyStepsMarkup(
    analysis.greedyBudgetResult,
    analysis.greedyScheduleResult,
  );

  ui.sensitivitySummary.textContent =
    analysis.sensitivity.length > 0
      ? `Peak sampled gap: ${bestSensitivityPoint.gap} points at ${formatBudget(bestSensitivityPoint.budget)}`
      : "No active events available for budget sensitivity analysis.";
  ui.sensitivityChart.innerHTML = createSensitivityMarkup(
    analysis.sensitivity,
    state.settings.budget,
  );
  ui.whatIfGrid.innerHTML = createWhatIfMarkup(analysis.whatIf);
  ui.recommendationGrid.innerHTML = createRecommendationsMarkup(analysis.recommendations);

  saveState(state);
}

function syncControls(state, ui) {
  ui.budgetSlider.value = state.settings.budget;
  ui.budgetInput.value = state.settings.budget;
  ui.staffSlider.value = state.settings.staffLimit;
  ui.staffInput.value = state.settings.staffLimit;
  ui.equipmentSlider.value = state.settings.equipmentLimit;
  ui.equipmentInput.value = state.settings.equipmentLimit;
  ui.stagesSelect.value = String(state.settings.stageCount);
  ui.prioritySlider.value = state.settings.priorityWeight;
  ui.priorityInput.value = state.settings.priorityWeight;
  ui.minPriority.value = String(state.settings.minPriority);
}

export function attachApp() {
  const state = loadState();
  const ui = {
    statsGrid: document.getElementById("stats-grid"),
    budgetSlider: document.getElementById("budget-slider"),
    budgetInput: document.getElementById("budget-input"),
    staffSlider: document.getElementById("staff-slider"),
    staffInput: document.getElementById("staff-input"),
    equipmentSlider: document.getElementById("equipment-slider"),
    equipmentInput: document.getElementById("equipment-input"),
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
    whatIfGrid: document.getElementById("what-if-grid"),
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

  function updateStaff(value) {
    state.settings.staffLimit = clamp(Number(value) || DEFAULT_SETTINGS.staffLimit, 10, 50);
    markStateCustom(state);
    redraw();
  }

  function updateEquipment(value) {
    state.settings.equipmentLimit = clamp(Number(value) || DEFAULT_SETTINGS.equipmentLimit, 8, 36);
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
  ui.staffSlider.addEventListener("input", (event) => updateStaff(event.target.value));
  ui.staffInput.addEventListener("input", (event) => updateStaff(event.target.value));
  ui.equipmentSlider.addEventListener("input", (event) => updateEquipment(event.target.value));
  ui.equipmentInput.addEventListener("input", (event) => updateEquipment(event.target.value));
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

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && ui.helpOverlay && !ui.helpOverlay.hidden) {
      setHelpOpen(ui, false);
    }
  });

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
      staffRequired: document.getElementById("event-staff").value,
      equipmentRequired: document.getElementById("event-equipment").value,
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
    document.getElementById("event-staff").value = "3";
    document.getElementById("event-equipment").value = "2";
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

  window.CampusFestOptimizerDebug = {
    buildDefaultState,
    computeAnalysis,
    getState: () => state,
    describeSelection: () => joinNames(state.lastAnalysis?.budgetResult?.selected || []),
  };
}
