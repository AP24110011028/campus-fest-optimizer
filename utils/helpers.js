import { timeToMinutes } from "./time.js";

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function uniqueValues(values) {
  return [...new Set(values)];
}

export function cloneEvents(events) {
  return events.map((event) => ({ ...event }));
}

export function getSortedCategories(events) {
  return uniqueValues(events.map((event) => event.category)).sort((left, right) =>
    left.localeCompare(right),
  );
}

export function sortByStart(events) {
  return [...events].sort((left, right) => {
    const startDiff = timeToMinutes(left.start) - timeToMinutes(right.start);
    if (startDiff !== 0) {
      return startDiff;
    }

    return timeToMinutes(left.end) - timeToMinutes(right.end);
  });
}

export function joinNames(events, limit = 3) {
  const names = events.slice(0, limit).map((event) => event.name);

  if (names.length === 0) {
    return "none";
  }

  if (events.length > limit) {
    return `${names.join(", ")}, and ${events.length - limit} more`;
  }

  return names.join(", ");
}
