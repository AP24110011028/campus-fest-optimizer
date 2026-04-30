import { formatBudget } from "../utils/format.js";
import { durationInMinutes } from "../utils/time.js";
import { computeAdvancedDensity, computePredictedScore, summarizeEvents } from "./scoring.js";

const NEGATIVE_SCORE = -2147483648;
const MAX_TRANSITIONS = 24_000_000;

function buildScaledScenario(events, settings) {
  // Keep the browser-friendly 3D DP exact for normal cases, but coarsen the
  // resource grid when the transition volume would otherwise grow too large.
  let budgetStep = 1;
  let staffStep = 1;
  let equipmentStep = 1;

  const getTransitionVolume = () =>
    (Math.floor(settings.budget / budgetStep) + 1) *
    (Math.floor(settings.staffLimit / staffStep) + 1) *
    (Math.floor(settings.equipmentLimit / equipmentStep) + 1) *
    Math.max(events.length, 1);

  while (getTransitionVolume() > MAX_TRANSITIONS) {
    if (budgetStep <= staffStep && budgetStep <= equipmentStep) {
      budgetStep += budgetStep < 3 ? 1 : 2;
    } else if (staffStep <= equipmentStep) {
      staffStep += 1;
    } else {
      equipmentStep += 1;
    }
  }

  const scaledEvents = events.map((event) => ({
    ...event,
    scaledCost: Math.ceil(event.cost / budgetStep),
    scaledStaff: Math.ceil(event.staffRequired / staffStep),
    scaledEquipment: Math.ceil(event.equipmentRequired / equipmentStep),
  }));

  return {
    budgetStep,
    staffStep,
    equipmentStep,
    scaledBudgetLimit: Math.floor(settings.budget / budgetStep),
    scaledStaffLimit: Math.floor(settings.staffLimit / staffStep),
    scaledEquipmentLimit: Math.floor(settings.equipmentLimit / equipmentStep),
    scaledEvents,
    approximate: budgetStep > 1 || staffStep > 1 || equipmentStep > 1,
  };
}

function index3(cost, staff, equipment, staffSize, equipmentSize) {
  return (cost * staffSize + staff) * equipmentSize + equipment;
}

function decodeIndex(index, staffSize, equipmentSize) {
  const cost = Math.floor(index / (staffSize * equipmentSize));
  const remainder = index % (staffSize * equipmentSize);
  const staff = Math.floor(remainder / equipmentSize);
  const equipment = remainder % equipmentSize;
  return { cost, staff, equipment };
}

function findBestStateIndex(scores) {
  let bestIndex = 0;
  let bestScore = scores[0];

  for (let index = 1; index < scores.length; index += 1) {
    if (scores[index] > bestScore) {
      bestScore = scores[index];
      bestIndex = index;
    }
  }

  return { bestIndex, bestScore };
}

function extractSelectedEvents(events, scaledEvents, decisions, bestIndex, dimensions) {
  const selected = [];
  let cursor = bestIndex;

  for (let eventIndex = events.length - 1; eventIndex >= 0; eventIndex -= 1) {
    if (decisions[eventIndex][cursor] === 0) {
      continue;
    }

    selected.push(events[eventIndex]);
    const resourcePoint = decodeIndex(cursor, dimensions.staffSize, dimensions.equipmentSize);
    const scaledEvent = scaledEvents[eventIndex];
    cursor = index3(
      resourcePoint.cost - scaledEvent.scaledCost,
      resourcePoint.staff - scaledEvent.scaledStaff,
      resourcePoint.equipment - scaledEvent.scaledEquipment,
      dimensions.staffSize,
      dimensions.equipmentSize,
    );
  }

  return selected.reverse();
}

export function solveAdvancedGreedyBudget(events, settings) {
  const ranked = [...events].sort((left, right) => {
    const densityDiff = computeAdvancedDensity(right, settings) - computeAdvancedDensity(left, settings);
    if (densityDiff !== 0) {
      return densityDiff;
    }

    const scoreDiff = computePredictedScore(right, settings) - computePredictedScore(left, settings);
    if (scoreDiff !== 0) {
      return scoreDiff;
    }

    return left.cost - right.cost;
  });

  const selected = [];
  const steps = [];
  let runningCost = 0;
  let runningStaff = 0;
  let runningEquipment = 0;
  let runningScore = 0;

  ranked.forEach((event, index) => {
    const eventScore = computePredictedScore(event, settings);
    const nextCost = runningCost + event.cost;
    const nextStaff = runningStaff + event.staffRequired;
    const nextEquipment = runningEquipment + event.equipmentRequired;
    const accepted =
      nextCost <= settings.budget &&
      nextStaff <= settings.staffLimit &&
      nextEquipment <= settings.equipmentLimit;

    if (accepted) {
      selected.push(event);
      runningCost = nextCost;
      runningStaff = nextStaff;
      runningEquipment = nextEquipment;
      runningScore += eventScore;
    }

    steps.push({
      order: index + 1,
      event,
      accepted,
      runningCost,
      runningStaff,
      runningEquipment,
      runningScore,
      eventScore,
      density: computeAdvancedDensity(event, settings),
      reason: accepted
        ? `Accepted because budget ${formatBudget(nextCost)}, staff ${nextStaff}, and equipment ${nextEquipment} stay inside the three resource caps.`
        : `Skipped because the next state would require ${formatBudget(nextCost)}, staff ${nextStaff}, and equipment ${nextEquipment}.`,
    });
  });

  const totals = summarizeEvents(selected, settings);

  return {
    selected,
    selectedIds: new Set(selected.map((event) => event.id)),
    steps,
    totalCost: totals.cost,
    totalImpact: totals.impact,
    totalScore: totals.totalScore,
    totalMinutes: totals.minutes,
    totalStaff: totals.staff,
    totalEquipment: totals.equipment,
    leftovers: {
      budget: settings.budget - totals.cost,
      staff: settings.staffLimit - totals.staff,
      equipment: settings.equipmentLimit - totals.equipment,
    },
  };
}

export function solveMultiConstraintKnapsack(events, settings, seedResult = null) {
  // This is the main funding optimizer: a 3D knapsack over budget, staff, and
  // equipment. We use rolling arrays for space efficiency and keep a compact
  // take/not-take matrix for reconstruction and explainability.
  const scaledScenario = buildScaledScenario(events, settings);
  const budgetSize = scaledScenario.scaledBudgetLimit + 1;
  const staffSize = scaledScenario.scaledStaffLimit + 1;
  const equipmentSize = scaledScenario.scaledEquipmentLimit + 1;
  const stateCount = budgetSize * staffSize * equipmentSize;
  const decisions = Array.from({ length: events.length }, () => new Uint8Array(stateCount));
  const previousScores = new Int32Array(stateCount);
  const currentScores = new Int32Array(stateCount);

  previousScores.fill(NEGATIVE_SCORE);
  previousScores[0] = 0;

  let activeScores = previousScores;
  let bufferScores = currentScores;
  const traceRows = [];

  scaledScenario.scaledEvents.forEach((event, eventIndex) => {
    bufferScores.set(activeScores);
    const predictedScore = computePredictedScore(events[eventIndex], settings);

    for (let budget = event.scaledCost; budget <= scaledScenario.scaledBudgetLimit; budget += 1) {
      for (let staff = event.scaledStaff; staff <= scaledScenario.scaledStaffLimit; staff += 1) {
        for (
          let equipment = event.scaledEquipment;
          equipment <= scaledScenario.scaledEquipmentLimit;
          equipment += 1
        ) {
          const index = index3(budget, staff, equipment, staffSize, equipmentSize);
          const previousIndex = index3(
            budget - event.scaledCost,
            staff - event.scaledStaff,
            equipment - event.scaledEquipment,
            staffSize,
            equipmentSize,
          );

          if (activeScores[previousIndex] === NEGATIVE_SCORE) {
            continue;
          }

          const candidateScore = activeScores[previousIndex] + predictedScore;
          if (candidateScore > bufferScores[index]) {
            bufferScores[index] = candidateScore;
            decisions[eventIndex][index] = 1;
          }
        }
      }
    }

    const { bestIndex, bestScore } = findBestStateIndex(bufferScores);
    const bestResources = decodeIndex(bestIndex, staffSize, equipmentSize);
    traceRows.push({
      event: events[eventIndex],
      predictedScore,
      frontierScore: bestScore,
      bestUsage: {
        budget: bestResources.cost * scaledScenario.budgetStep,
        staff: bestResources.staff * scaledScenario.staffStep,
        equipment: bestResources.equipment * scaledScenario.equipmentStep,
      },
      approximate: scaledScenario.approximate,
    });

    const swap = activeScores;
    activeScores = bufferScores;
    bufferScores = swap;
  });

  const { bestIndex, bestScore } = findBestStateIndex(activeScores);
  const selected = extractSelectedEvents(events, scaledScenario.scaledEvents, decisions, bestIndex, {
    staffSize,
    equipmentSize,
  });
  const selectedIds = new Set(selected.map((event) => event.id));
  const totals = summarizeEvents(selected, settings);

  return {
    events,
    selected,
    selectedIds,
    totalCost: totals.cost,
    totalImpact: totals.impact,
    totalScore: totals.totalScore,
    totalMinutes: totals.minutes,
    totalStaff: totals.staff,
    totalEquipment: totals.equipment,
    leftovers: {
      budget: settings.budget - totals.cost,
      staff: settings.staffLimit - totals.staff,
      equipment: settings.equipmentLimit - totals.equipment,
    },
    decisions,
    bestScore,
    traceRows,
    scaledScenario,
    seedScore: seedResult?.totalScore || 0,
  };
}

export function solveHybridBudget(events, settings) {
  const greedySeed = solveAdvancedGreedyBudget(events, settings);
  const refined = solveMultiConstraintKnapsack(events, settings, greedySeed);

  return {
    ...refined,
    seedResult: greedySeed,
    hybridGain: refined.totalScore - greedySeed.totalScore,
  };
}
