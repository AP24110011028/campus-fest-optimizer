import { formatBudget } from "../utils/format.js";
import { joinNames, sortByStart } from "../utils/helpers.js";
import { buildWhatIfSimulations } from "./simulation.js";
import { solveAdvancedGreedyBudget, solveHybridBudget } from "./budget.js";
import { optimizeMultiStageSchedule, solveGreedySchedule, solveWeightedInterval } from "./scheduling.js";

function createScenarioKey(events, settings) {
  const eventKey = events
    .map(
      (event) =>
        `${event.id}:${event.cost}:${event.impact}:${event.priority}:${event.staffRequired}:${event.equipmentRequired}:${event.start}:${event.end}`,
    )
    .join(",");
  return [
    settings.budget,
    settings.staffLimit,
    settings.equipmentLimit,
    settings.stageCount,
    settings.priorityWeight,
    eventKey,
  ].join("|");
}

function buildRecommendations(state, baseAnalysis, whatIf) {
  const recommendations = [];
  const dpOnlyEvents = baseAnalysis.budgetResult.selected.filter(
    (event) => !baseAnalysis.greedyBudgetResult.selectedIds.has(event.id),
  );
  const deferred = baseAnalysis.stagePlan.overflow;

  recommendations.push({
    title: "Use hybrid DP for the funding lock",
    body:
      dpOnlyEvents.length > 0
        ? `The advanced greedy seed still misses ${joinNames(dpOnlyEvents, 2)}. The multi-constraint DP finds a globally stronger mix across budget, staff, and equipment.`
        : "The greedy seed is close, but DP still certifies that the funded lineup is globally optimal under all three caps.",
  });

  recommendations.push({
    title: "Protect the stage-critical anchors",
    body:
      baseAnalysis.stagePlan.selected.length > 0
        ? `${joinNames(baseAnalysis.stagePlan.selected)} define the strongest multi-stage schedule. Together they maximize predicted score while keeping lane conflicts under control.`
        : "Increase the resource envelope or relax filters to unlock a viable stage schedule.",
  });

  recommendations.push({
    title: "Plan for overflow contingencies",
    body:
      deferred.length > 0
        ? `${deferred.length} funded event(s) are deferred by the multi-stage optimizer. Use the overflow suggestions to shift ${joinNames(deferred, 2)} or compress durations before adding new capacity.`
        : `All funded events fit into the optimized ${state.settings.stageCount}-stage schedule with ${Math.round(baseAnalysis.stagePlan.utilization * 100)}% utilization.`,
  });

  recommendations.push({
    title: "Best what-if lever",
    body: whatIf.bestNarrative,
  });

  return recommendations;
}

export function eventMatchesFilters(event, state) {
  return (
    state.selectedCategories.includes(event.category) &&
    event.priority >= state.settings.minPriority
  );
}

export function getFilterReasons(event, state) {
  const reasons = [];

  if (!state.selectedCategories.includes(event.category)) {
    reasons.push("category not selected");
  }

  if (event.priority < state.settings.minPriority) {
    reasons.push(`priority below P${state.settings.minPriority}`);
  }

  return reasons;
}

export function computeAnalysis(state) {
  // Cache scenario evaluations so the what-if engine can reuse exact solves
  // instead of recomputing identical states again and again.
  const activeEvents = sortByStart(state.events.filter((event) => eventMatchesFilters(event, state)));
  const cache = new Map();
  const evaluateScenario = (events, settings) => {
    const key = createScenarioKey(events, settings);
    if (cache.has(key)) {
      return cache.get(key);
    }

    const budgetResult = solveHybridBudget(events, settings);
    const greedyBudgetResult = budgetResult.seedResult || solveAdvancedGreedyBudget(events, settings);
    const weightedResult = solveWeightedInterval(budgetResult.selected, settings);
    const greedyScheduleResult = solveGreedySchedule(budgetResult.selected, settings);
    const stagePlan = optimizeMultiStageSchedule(
      budgetResult.selected,
      settings.stageCount,
      settings,
    );
    const scenario = {
      budgetResult,
      greedyBudgetResult,
      weightedResult,
      greedyScheduleResult,
      stagePlan,
    };

    cache.set(key, scenario);
    return scenario;
  };

  const baseAnalysis = evaluateScenario(activeEvents, state.settings);
  const whatIf = buildWhatIfSimulations(activeEvents, state.settings, evaluateScenario, baseAnalysis);
  const recommendations = buildRecommendations(state, baseAnalysis, whatIf);

  const barData = [
    {
      label: "Hybrid DP Funding",
      subtitle: "Optimal under budget, staff, and equipment",
      value: baseAnalysis.budgetResult.totalScore,
      variant: "dp",
      valueLabel: `${baseAnalysis.budgetResult.totalScore} pts`,
    },
    {
      label: "Advanced Greedy",
      subtitle: "Density-based seed solution",
      value: baseAnalysis.greedyBudgetResult.totalScore,
      variant: "greedy",
      valueLabel: `${baseAnalysis.greedyBudgetResult.totalScore} pts`,
    },
    {
      label: "Multi-Stage Schedule",
      subtitle: "Flow-based stage optimizer",
      value: baseAnalysis.stagePlan.totalScore,
      variant: "wis",
      valueLabel: `${baseAnalysis.stagePlan.totalScore} pts`,
    },
    {
      label: "Finish-Time Greedy",
      subtitle: "Single-stage baseline",
      value: baseAnalysis.greedyScheduleResult.totalScore,
      variant: "schedule",
      valueLabel: `${baseAnalysis.greedyScheduleResult.totalScore} pts`,
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
      value: String(baseAnalysis.budgetResult.totalScore),
      subtext: `${baseAnalysis.budgetResult.selected.length} proposals funded`,
    },
    {
      label: "Resource Slack",
      value: `${formatBudget(baseAnalysis.budgetResult.leftovers.budget)}`,
      subtext: `Spare staff ${baseAnalysis.budgetResult.leftovers.staff} | equipment ${baseAnalysis.budgetResult.leftovers.equipment}`,
    },
    {
      label: "Hybrid Gain",
      value: `+${baseAnalysis.budgetResult.hybridGain}`,
      subtext: "DP refinement over greedy seed",
    },
    {
      label: "Stage Utilization",
      value: `${Math.round(baseAnalysis.stagePlan.utilization * 100)}%`,
      subtext: `${state.settings.stageCount} optimized stages`,
    },
    {
      label: "Best What-If",
      value:
        whatIf.bestAddition.delta > 0
          ? `+${whatIf.bestAddition.delta}`
          : `+${Math.max(0, whatIf.bestBudgetPoint.dpScore - baseAnalysis.budgetResult.totalScore)}`,
      subtext: "Strongest simulated score improvement",
    },
  ];

  const insights = [
    {
      title: `+${baseAnalysis.budgetResult.totalScore - baseAnalysis.greedyBudgetResult.totalScore} funding score`,
      body: "The DP optimizer explores cross-resource trade-offs that even an advanced greedy seed can miss.",
    },
    {
      title: `${baseAnalysis.stagePlan.selected.length} events scheduled`,
      body: "The multi-stage flow solver maximizes predicted score across all lanes while reducing idle waste.",
    },
    {
      title: `${baseAnalysis.stagePlan.overflow.length} deferred blocks`,
      body:
        baseAnalysis.stagePlan.overflow.length > 0
          ? "Overflow suggestions show whether shifting, moving, or shortening can recover those events."
          : "No funded event was deferred by the current stage optimization run.",
    },
  ];

  return {
    activeEvents,
    budgetResult: baseAnalysis.budgetResult,
    greedyBudgetResult: baseAnalysis.greedyBudgetResult,
    weightedResult: baseAnalysis.weightedResult,
    greedyScheduleResult: baseAnalysis.greedyScheduleResult,
    stagePlan: baseAnalysis.stagePlan,
    barData,
    stats,
    insights,
    sensitivity: whatIf.budgetSeries,
    recommendations,
    whatIf,
  };
}
