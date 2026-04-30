import { computePredictedScore } from "./scoring.js";

function buildBudgetSeries(activeEvents, settings, evaluateScenario) {
  const budgets = [];
  for (let budget = 40; budget <= settings.budget; budget += 10) {
    budgets.push(budget);
  }

  if (!budgets.includes(settings.budget)) {
    budgets.push(settings.budget);
  }

  return budgets.map((budget) => {
    const scenario = evaluateScenario(activeEvents, {
      ...settings,
      budget,
    });
    return {
      budget,
      dpScore: scenario.budgetResult.totalScore,
      greedyScore: scenario.greedyBudgetResult.totalScore,
      gap: scenario.budgetResult.totalScore - scenario.greedyBudgetResult.totalScore,
    };
  });
}

function buildRemovalImpacts(activeEvents, settings, evaluateScenario, baseAnalysis) {
  return [...baseAnalysis.budgetResult.selected]
    .sort(
      (left, right) =>
        computePredictedScore(right, settings) - computePredictedScore(left, settings),
    )
    .slice(0, 4)
    .map((event) => {
      const scenario = evaluateScenario(
        activeEvents.filter((candidate) => candidate.id !== event.id),
        settings,
      );
      return {
        event,
        delta: scenario.budgetResult.totalScore - baseAnalysis.budgetResult.totalScore,
        nextScore: scenario.budgetResult.totalScore,
        note:
          scenario.budgetResult.totalScore < baseAnalysis.budgetResult.totalScore
            ? "Removing this event weakens the optimized funding mix."
            : "The planner can rebalance without losing score in this case.",
      };
    });
}

function buildAdditionImpacts(activeEvents, settings, evaluateScenario, baseAnalysis) {
  return activeEvents
    .filter((event) => !baseAnalysis.budgetResult.selectedIds.has(event.id))
    .sort(
      (left, right) =>
        computePredictedScore(right, settings) - computePredictedScore(left, settings),
    )
    .slice(0, 4)
    .map((event) => {
      const relaxedSettings = {
        ...settings,
        budget: settings.budget + event.cost,
        staffLimit: settings.staffLimit + event.staffRequired,
        equipmentLimit: settings.equipmentLimit + event.equipmentRequired,
      };
      const scenario = evaluateScenario(activeEvents, relaxedSettings);
      return {
        event,
        delta: scenario.budgetResult.totalScore - baseAnalysis.budgetResult.totalScore,
        nextScore: scenario.budgetResult.totalScore,
        unlocked: scenario.budgetResult.selectedIds.has(event.id),
        note: scenario.budgetResult.selectedIds.has(event.id)
          ? "This proposal enters the optimized lineup once the resource envelope is expanded."
          : "Even with relaxed resources, another combination still dominates this event.",
      };
    });
}

export function buildWhatIfSimulations(activeEvents, settings, evaluateScenario, baseAnalysis) {
  const budgetSeries = buildBudgetSeries(activeEvents, settings, evaluateScenario);
  const removalImpacts = buildRemovalImpacts(activeEvents, settings, evaluateScenario, baseAnalysis);
  const additionImpacts = buildAdditionImpacts(activeEvents, settings, evaluateScenario, baseAnalysis);
  const bestBudgetPoint = budgetSeries.reduce(
    (best, point) => (point.dpScore > best.dpScore ? point : best),
    budgetSeries[0] || { budget: settings.budget, dpScore: 0, greedyScore: 0, gap: 0 },
  );
  const bestAddition = additionImpacts.reduce(
    (best, point) => (point.delta > best.delta ? point : best),
    additionImpacts[0] || { delta: Number.NEGATIVE_INFINITY },
  );

  let bestNarrative = "The current configuration is already close to the best sampled operating point.";
  if (bestAddition.delta > 0) {
    bestNarrative = `The strongest upgrade path is unlocking ${bestAddition.event.name}; it adds ${bestAddition.delta} score when resources are expanded to absorb its needs.`;
  } else if (bestBudgetPoint.dpScore > baseAnalysis.budgetResult.totalScore) {
    bestNarrative = `The best sampled improvement comes from lifting the budget toward ${bestBudgetPoint.budget}k, where the optimal score reaches ${bestBudgetPoint.dpScore}.`;
  }

  return {
    budgetSeries,
    removalImpacts,
    additionImpacts,
    bestBudgetPoint,
    bestAddition,
    bestNarrative,
  };
}
