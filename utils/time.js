import { FESTIVAL_END_TIME, FESTIVAL_START_TIME } from "../models/config.js";

export function timeToMinutes(timeValue) {
  const [hours, minutes] = String(timeValue).split(":").map(Number);
  return hours * 60 + minutes;
}

export function minutesToTime(totalMinutes) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function isValidTime(value) {
  return /^\d{2}:\d{2}$/.test(String(value));
}

export function durationInMinutes(event) {
  return Math.max(0, timeToMinutes(event.end) - timeToMinutes(event.start));
}

export const FESTIVAL_START = timeToMinutes(FESTIVAL_START_TIME);
export const FESTIVAL_END = timeToMinutes(FESTIVAL_END_TIME);
