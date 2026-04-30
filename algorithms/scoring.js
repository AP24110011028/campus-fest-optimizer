import { clamp } from "../utils/helpers.js";
import { durationInMinutes, timeToMinutes } from "../utils/time.js";

const CATEGORY_TREND_BOOST = {
  Music: 0.22,
  Showcase: 0.2,
  Performance: 0.17,
  Gaming: 0.15,
  Tech: 0.13,
  Design: 0.1,
  Expo: 0.08,
  Comedy: 0.07,
  Arts: 0.06,
  Food: 0.05,
  Cinema: 0.03,
};

const trendCache = new Map();
const scoreCache = new Map();

function buildCacheKey(event, settings) {
  return [
    event.id,
    event.impact,
    event.priority,
    event.staffRequired,
    event.equipmentRequired,
    event.start,
    event.end,
    settings.priorityWeight,
    settings.stageCount,
  ].join("|");
}

export function computeTrendFactor(event, settings) {
  const cacheKey = `trend:${buildCacheKey(event, settings)}`;
  if (trendCache.has(cacheKey)) {
    return trendCache.get(cacheKey);
  }

  const startMinutes = timeToMinutes(event.start);
  const duration = durationInMinutes(event);
  const primeTimeBoost =
    startMinutes >= 18 * 60 ? 0.14 : startMinutes >= 16 * 60 ? 0.09 : startMinutes >= 12 * 60 ? 0.04 : 0;
  const categoryBoost = CATEGORY_TREND_BOOST[event.category] || 0.04;
  const priorityBoost = event.priority * 0.03;
  const durationPenalty = Math.min(Math.max(duration - 150, 0) / 600, 0.16);
  const resourcePenalty = Math.min((event.staffRequired + event.equipmentRequired) / 120, 0.08);

  const factor = clamp(0.88 + categoryBoost + primeTimeBoost + priorityBoost - durationPenalty - resourcePenalty, 0.82, 1.45);
  trendCache.set(cacheKey, factor);
  return factor;
}

export function computePredictedScore(event, settings) {
  const cacheKey = `score:${buildCacheKey(event, settings)}`;
  if (scoreCache.has(cacheKey)) {
    return scoreCache.get(cacheKey);
  }

  const predictedScore = Math.round(event.impact * computeTrendFactor(event, settings) + event.priority * settings.priorityWeight);
  scoreCache.set(cacheKey, predictedScore);
  return predictedScore;
}

export function computeResourceUsage(event) {
  return Math.max(1, event.staffRequired + event.equipmentRequired);
}

export function computeAdvancedDensity(event, settings) {
  const durationFactor = Math.max(durationInMinutes(event) / 60, 0.75);
  const resourceFactor = Math.max(computeResourceUsage(event) / 4, 1);
  return computePredictedScore(event, settings) / (Math.max(event.cost, 1) * durationFactor * resourceFactor);
}

export function summarizeEvents(events, settings) {
  return events.reduce(
    (summary, event) => {
      summary.cost += event.cost;
      summary.impact += event.impact;
      summary.totalScore += computePredictedScore(event, settings);
      summary.minutes += durationInMinutes(event);
      summary.staff += event.staffRequired;
      summary.equipment += event.equipmentRequired;
      summary.trend += computeTrendFactor(event, settings);
      return summary;
    },
    {
      count: events.length,
      cost: 0,
      impact: 0,
      totalScore: 0,
      minutes: 0,
      staff: 0,
      equipment: 0,
      trend: 0,
    },
  );
}
