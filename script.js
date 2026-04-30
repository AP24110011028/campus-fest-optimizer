import { attachApp } from "./ui/app.js";

if (typeof document !== "undefined") {
  document.addEventListener("DOMContentLoaded", attachApp);
}
