import { STAGE_LABELS } from "../models/config.js";
import { sortByStart } from "../utils/helpers.js";
import { FESTIVAL_END, FESTIVAL_START, durationInMinutes, minutesToTime, timeToMinutes } from "../utils/time.js";
import { computePredictedScore, summarizeEvents } from "./scoring.js";

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

function addEdge(graph, from, to, capacity, cost, meta = null) {
  const forward = {
    to,
    rev: graph[to].length,
    capacity,
    cost,
    originalCapacity: capacity,
    meta,
  };
  const backward = {
    to: from,
    rev: graph[from].length,
    capacity: 0,
    cost: -cost,
    originalCapacity: 0,
    meta: null,
  };

  graph[from].push(forward);
  graph[to].push(backward);
  return forward;
}

function minCostMaxFlow(graph, source, sink, maxFlow) {
  // The stage scheduler is modeled as flow over a time-expanded network.
  // Event edges carry negative cost (good value), while wait edges carry
  // positive cost so equal-score solutions prefer lower idle time.
  const nodeCount = graph.length;
  let flow = 0;
  let cost = 0;

  while (flow < maxFlow) {
    const distance = Array(nodeCount).fill(Number.POSITIVE_INFINITY);
    const inQueue = Array(nodeCount).fill(false);
    const previousNode = Array(nodeCount).fill(-1);
    const previousEdge = Array(nodeCount).fill(-1);
    const queue = [source];
    distance[source] = 0;
    inQueue[source] = true;

    while (queue.length > 0) {
      const node = queue.shift();
      inQueue[node] = false;

      graph[node].forEach((edge, edgeIndex) => {
        if (edge.capacity <= 0) {
          return;
        }

        const nextDistance = distance[node] + edge.cost;
        if (nextDistance >= distance[edge.to]) {
          return;
        }

        distance[edge.to] = nextDistance;
        previousNode[edge.to] = node;
        previousEdge[edge.to] = edgeIndex;

        if (!inQueue[edge.to]) {
          queue.push(edge.to);
          inQueue[edge.to] = true;
        }
      });
    }

    if (previousNode[sink] === -1) {
      break;
    }

    let increment = maxFlow - flow;
    for (let node = sink; node !== source; node = previousNode[node]) {
      const edge = graph[previousNode[node]][previousEdge[node]];
      increment = Math.min(increment, edge.capacity);
    }

    for (let node = sink; node !== source; node = previousNode[node]) {
      const edge = graph[previousNode[node]][previousEdge[node]];
      edge.capacity -= increment;
      graph[node][edge.rev].capacity += increment;
      cost += edge.cost * increment;
    }

    flow += increment;
  }

  return { flow, cost };
}

function assignEventsToLanes(events, stageCount, settings) {
  const lanes = Array.from({ length: stageCount }, (_, index) => ({
    label: STAGE_LABELS[index],
    items: [],
    availableAt: FESTIVAL_START,
    usedMinutes: 0,
    idleMinutes: 0,
  }));

  for (const event of sortByStart(events)) {
    const startMinutes = timeToMinutes(event.start);
    let bestLaneIndex = -1;
    let bestAvailability = -1;

    lanes.forEach((lane, index) => {
      if (lane.availableAt <= startMinutes && lane.availableAt >= bestAvailability) {
        bestLaneIndex = index;
        bestAvailability = lane.availableAt;
      }
    });

    if (bestLaneIndex === -1) {
      continue;
    }

    const lane = lanes[bestLaneIndex];
    lane.idleMinutes += Math.max(0, startMinutes - lane.availableAt);
    lane.items.push({
      ...event,
      score: computePredictedScore(event, settings),
      trendFactor: computePredictedScore(event, settings) / Math.max(event.impact, 1),
    });
    lane.availableAt = timeToMinutes(event.end);
    lane.usedMinutes += durationInMinutes(event);
  }

  const totalScheduledMinutes = lanes.reduce((sum, lane) => sum + lane.usedMinutes, 0);
  const totalIdleMinutes = lanes.reduce((sum, lane) => sum + lane.idleMinutes, 0);

  return {
    lanes,
    totalScheduledMinutes,
    totalIdleMinutes,
    scheduledCount: lanes.reduce((sum, lane) => sum + lane.items.length, 0),
    utilization:
      stageCount > 0 ? totalScheduledMinutes / (stageCount * (FESTIVAL_END - FESTIVAL_START)) : 0,
  };
}

function buildGapCatalog(lanes) {
  return lanes.flatMap((lane) => {
    const items = [...lane.items].sort(
      (left, right) => timeToMinutes(left.start) - timeToMinutes(right.start),
    );
    const gaps = [];
    let cursor = FESTIVAL_START;

    items.forEach((event) => {
      const startMinutes = timeToMinutes(event.start);
      if (startMinutes > cursor) {
        gaps.push({
          laneLabel: lane.label,
          start: cursor,
          end: startMinutes,
          duration: startMinutes - cursor,
        });
      }
      cursor = Math.max(cursor, timeToMinutes(event.end));
    });

    if (cursor < FESTIVAL_END) {
      gaps.push({
        laneLabel: lane.label,
        start: cursor,
        end: FESTIVAL_END,
        duration: FESTIVAL_END - cursor,
      });
    }

    return gaps;
  });
}

function buildOverflowSuggestions(event, lanes) {
  const duration = durationInMinutes(event);
  const gaps = buildGapCatalog(lanes);
  const exactGap = gaps
    .filter((gap) => gap.duration >= duration)
    .sort((left, right) => {
      const leftDistance = Math.abs(left.start - timeToMinutes(event.start));
      const rightDistance = Math.abs(right.start - timeToMinutes(event.start));
      return leftDistance - rightDistance || left.duration - right.duration;
    })[0];
  const largestGap = [...gaps].sort((left, right) => right.duration - left.duration)[0];
  const leastLoadedLane = [...lanes].sort((left, right) => left.usedMinutes - right.usedMinutes)[0];
  const suggestions = [];

  if (exactGap) {
    suggestions.push(
      `Shift to ${exactGap.laneLabel} at ${minutesToTime(exactGap.start)} - ${minutesToTime(exactGap.start + duration)}.`,
    );
  }

  if (leastLoadedLane) {
    suggestions.push(`Move the block to ${leastLoadedLane.label} if an adjacent event is reassigned or shortened.`);
  }

  if (largestGap && largestGap.duration >= Math.max(30, Math.floor(duration * 0.6)) && largestGap.duration < duration) {
    suggestions.push(
      `Reduce duration by ${duration - largestGap.duration} min to fit ${largestGap.laneLabel} gap ${minutesToTime(largestGap.start)} - ${minutesToTime(largestGap.end)}.`,
    );
  }

  if (suggestions.length === 0) {
    suggestions.push("Increase stage capacity or move this event into a side venue window.");
  }

  return suggestions;
}

export function solveWeightedInterval(events, settings) {
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
    const includeScore = computePredictedScore(event, settings) + optimal[predecessors[index - 1] + 1];
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
    const includeScore = computePredictedScore(event, settings) + optimal[predecessors[pointer - 1] + 1];
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

  const totals = summarizeEvents(selected, settings);

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
    totalScore: totals.totalScore,
    totalMinutes: totals.minutes,
    totalStaff: totals.staff,
    totalEquipment: totals.equipment,
  };
}

export function solveGreedySchedule(events, settings) {
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
    const predictedScore = computePredictedScore(event, settings);

    if (accepted) {
      selected.push(event);
      lastFinish = eventFinish;
      runningScore += predictedScore;
    }

    steps.push({
      order: index + 1,
      event,
      accepted,
      runningScore,
      eventScore: predictedScore,
      reason: accepted
        ? "Accepted because it starts after the last locked finish time."
        : `Skipped because it overlaps the current finish boundary at ${minutesToTime(lastFinish)}.`,
    });
  });

  const totals = summarizeEvents(selected, settings);

  return {
    candidates: ordered,
    selected,
    steps,
    totalCost: totals.cost,
    totalImpact: totals.impact,
    totalScore: totals.totalScore,
    totalMinutes: totals.minutes,
    totalStaff: totals.staff,
    totalEquipment: totals.equipment,
  };
}

export function optimizeMultiStageSchedule(events, stageCount, settings) {
  // This solves the "best total score across K stages" problem globally first,
  // then converts the chosen set into concrete lane assignments and recovery
  // suggestions for deferred events.
  if (events.length === 0 || stageCount <= 0) {
    return {
      selected: [],
      selectedIds: new Set(),
      overflow: [],
      overflowSuggestions: [],
      lanes: Array.from({ length: stageCount }, (_, index) => ({
        label: STAGE_LABELS[index],
        items: [],
        availableAt: FESTIVAL_START,
        usedMinutes: 0,
        idleMinutes: 0,
      })),
      totalScore: 0,
      totalMinutes: 0,
      utilization: 0,
      totalIdleMinutes: 0,
      scheduledCount: 0,
    };
  }

  const timePoints = [...new Set([FESTIVAL_START, FESTIVAL_END, ...events.flatMap((event) => [timeToMinutes(event.start), timeToMinutes(event.end)])])].sort((left, right) => left - right);
  const timeToIndex = new Map(timePoints.map((time, index) => [time, index]));
  const source = timePoints.length;
  const sink = timePoints.length + 1;
  const graph = Array.from({ length: timePoints.length + 2 }, () => []);
  const eventEdges = [];

  addEdge(graph, source, 0, stageCount, 0);
  addEdge(graph, timePoints.length - 1, sink, stageCount, 0);

  for (let index = 0; index < timePoints.length - 1; index += 1) {
    const gapMinutes = timePoints[index + 1] - timePoints[index];
    addEdge(graph, index, index + 1, stageCount, gapMinutes);
  }

  events.forEach((event) => {
    const startIndex = timeToIndex.get(timeToMinutes(event.start));
    const endIndex = timeToIndex.get(timeToMinutes(event.end));
    const eventScore = computePredictedScore(event, settings);
    const duration = durationInMinutes(event);
    const edge = addEdge(graph, startIndex, endIndex, 1, -(eventScore * 1000 + duration), {
      type: "event",
      event,
    });
    eventEdges.push(edge);
  });

  minCostMaxFlow(graph, source, sink, stageCount);

  const selected = eventEdges
    .filter((edge) => edge.originalCapacity === 1 && edge.capacity === 0)
    .map((edge) => edge.meta.event);
  const selectedIds = new Set(selected.map((event) => event.id));
  const overflow = events.filter((event) => !selectedIds.has(event.id));
  const lanePlan = assignEventsToLanes(selected, stageCount, settings);
  const overflowSuggestions = overflow.map((event) => ({
    event,
    suggestions: buildOverflowSuggestions(event, lanePlan.lanes),
  }));
  const totals = summarizeEvents(selected, settings);

  return {
    selected,
    selectedIds,
    overflow,
    overflowSuggestions,
    lanes: lanePlan.lanes,
    totalScore: totals.totalScore,
    totalMinutes: totals.minutes,
    totalCost: totals.cost,
    totalStaff: totals.staff,
    totalEquipment: totals.equipment,
    totalIdleMinutes: lanePlan.totalIdleMinutes,
    utilization: lanePlan.utilization,
    scheduledCount: lanePlan.scheduledCount,
  };
}
