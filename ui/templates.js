import { SCENARIO_PRESETS } from "../models/config.js";
import { escapeHtml, formatBudget, formatDecimal } from "../utils/format.js";
import { durationInMinutes, FESTIVAL_END, FESTIVAL_START, timeToMinutes } from "../utils/time.js";
import { computePredictedScore } from "../algorithms/scoring.js";

export function createStatsMarkup(stats) {
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

export function createCategoryFiltersMarkup(categories, selectedCategories) {
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

export function createCategoryOptionMarkup(categories) {
  return categories
    .map((category) => `<option value="${escapeHtml(category)}"></option>`)
    .join("");
}

export function createPresetMarkup(activePreset) {
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

export function createEventMarkup(events) {
  if (events.length === 0) {
    return '<div class="empty-state">No proposals in the scenario yet. Add one to start optimizing.</div>';
  }

  return events
    .map((event) => {
      const statusText = event.active ? "In model" : "Filtered";
      const subtitle = event.active
        ? "Included in the optimization input."
        : `Filtered: ${event.reasons.join(", ")}.`;

      return `
        <article class="event-card ${event.active ? "" : "inactive"}">
          <div class="event-top">
            <div>
              <div class="event-name">${escapeHtml(event.name)}</div>
              <div class="muted-note">${escapeHtml(event.start)} - ${escapeHtml(event.end)}</div>
            </div>
            <button class="remove-btn" type="button" data-remove-id="${escapeHtml(event.id)}">Remove</button>
          </div>
          <span class="event-status ${event.active ? "active" : "inactive"}">${escapeHtml(statusText)}</span>
          <div class="badge-row">
            <span class="pill"><strong>${escapeHtml(event.category)}</strong></span>
            <span class="pill">Priority <strong>P${event.priority}</strong></span>
            <span class="pill">Cost <strong>${formatBudget(event.cost)}</strong></span>
            <span class="pill">Staff <strong>${event.staffRequired}</strong></span>
            <span class="pill">Equipment <strong>${event.equipmentRequired}</strong></span>
            <span class="pill">Trend <strong>${formatDecimal(event.trendFactor, 2)}x</strong></span>
            <span class="pill">Predicted <strong>${event.predictedScore}</strong></span>
            <span class="pill">Density <strong>${formatDecimal(event.density, 2)}</strong></span>
          </div>
          <p class="selection-subtext">${escapeHtml(event.note || subtitle)}</p>
        </article>
      `;
    })
    .join("");
}

export function createSelectionMarkup(events, settings, variant, emptyText) {
  if (events.length === 0) {
    return `<div class="empty-state">${escapeHtml(emptyText)}</div>`;
  }

  return events
    .map((event) => {
      const predictedScore = computePredictedScore(event, settings);
      return `
        <article class="selection-card ${variant}">
          <div class="selection-top">
            <div class="selection-name">${escapeHtml(event.name)}</div>
            <strong>${predictedScore} pts</strong>
          </div>
          <div class="selection-meta">
            <span class="pill"><strong>${escapeHtml(event.category)}</strong></span>
            <span class="pill">${formatBudget(event.cost)}</span>
            <span class="pill">P${event.priority}</span>
            <span class="pill">${escapeHtml(event.start)} - ${escapeHtml(event.end)}</span>
            <span class="pill">Staff ${event.staffRequired}</span>
            <span class="pill">Equip ${event.equipmentRequired}</span>
          </div>
          <p class="selection-subtext">${escapeHtml(event.note)}</p>
        </article>
      `;
    })
    .join("");
}

export function createComparisonBarsMarkup(barData) {
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

export function createInsightsMarkup(insights) {
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

export function createSensitivityMarkup(series, currentBudget) {
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

export function createRecommendationsMarkup(recommendations) {
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
  const startOffset = event.startMinutes - FESTIVAL_START;
  const rawWidth = (durationInMinutes(event) / totalMinutes) * 100;
  const left = (startOffset / totalMinutes) * 100;
  const width = Math.min(Math.max(rawWidth, 7), Math.max(2, 100 - left));
  return { left, width };
}

export function createStagePlanMarkup(stagePlan) {
  return stagePlan.lanes
    .map((lane, index) => {
      const blocks = lane.items
        .map((event) => {
          const startMinutes = timeToMinutes(event.start);
          const positioned = getEventPosition({ ...event, startMinutes });
          return `
            <div
              class="stage-block stage-${index}"
              style="left: ${positioned.left}%; width: ${positioned.width}%;"
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

export function createOverflowMarkup(stagePlan) {
  if (stagePlan.overflow.length === 0) {
    return '<div class="overflow-ok">All funded events fit into the optimized stage schedule.</div>';
  }

  return `
    <div class="overflow-stack">
      ${stagePlan.overflowSuggestions
        .map(
          (item) => `
            <article class="overflow-card">
              <strong>${escapeHtml(item.event.name)}</strong>
              <p>${escapeHtml(item.event.start)} - ${escapeHtml(item.event.end)} | ${formatBudget(item.event.cost)} | staff ${item.event.staffRequired} | equip ${item.event.equipmentRequired}</p>
              <div class="suggestion-list">
                ${item.suggestions
                  .map((suggestion) => `<span class="overflow-pill">${escapeHtml(suggestion)}</span>`)
                  .join("")}
              </div>
            </article>
          `,
        )
        .join("")}
    </div>
  `;
}

export function createBudgetTraceMarkup(result) {
  if (result.events.length === 0) {
    return '<div class="empty-state">No active proposals are available for multi-constraint optimization.</div>';
  }

  const rows = result.traceRows
    .map(
      (row) => `
        <tr class="${result.selectedIds.has(row.event.id) ? "highlight" : ""}">
          <td>${escapeHtml(row.event.name)}</td>
          <td>${row.predictedScore}</td>
          <td>${formatBudget(row.event.cost)}</td>
          <td>${row.event.staffRequired}</td>
          <td>${row.event.equipmentRequired}</td>
          <td>${row.frontierScore}</td>
          <td>${formatBudget(row.bestUsage.budget)}</td>
          <td>${row.bestUsage.staff}</td>
          <td>${row.bestUsage.equipment}</td>
        </tr>
      `,
    )
    .join("");

  return `
    <div class="trace-caption">
      ${result.scaledScenario.approximate
        ? `Adaptive scaling active: budget step ${result.scaledScenario.budgetStep}, staff step ${result.scaledScenario.staffStep}, equipment step ${result.scaledScenario.equipmentStep}.`
        : "Exact 3D dynamic programming is active for budget, staff, and equipment."}
    </div>
    <table class="trace-table">
      <thead>
        <tr>
          <th>Event</th>
          <th>Pred Score</th>
          <th>Cost</th>
          <th>Staff</th>
          <th>Equip</th>
          <th>Best OPT</th>
          <th>Budget Used</th>
          <th>Staff Used</th>
          <th>Equip Used</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

export function createWeightedTraceMarkup(result) {
  if (result.candidates.length === 0) {
    return '<div class="empty-state">Fund at least one event before weighted interval scheduling can run.</div>';
  }

  const rows = result.trace
    .map(
      (row) => `
        <tr class="${row.chosen ? "highlight" : ""}">
          <td>${escapeHtml(row.event.name)}</td>
          <td>${escapeHtml(row.event.start)} - ${escapeHtml(row.event.end)}</td>
          <td>${row.predecessor >= 0 ? row.predecessor + 1 : 0}</td>
          <td>${row.includeScore}</td>
          <td>${row.excludeScore}</td>
          <td>${row.bestScore}</td>
          <td>${row.chosen ? "Take" : "Skip"}</td>
        </tr>
      `,
    )
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

function createStepColumnMarkup(title, steps) {
  if (steps.length === 0) {
    return `
      <div class="step-group">
        <h3>${escapeHtml(title)}</h3>
        <div class="empty-state">No heuristic steps available.</div>
      </div>
    `;
  }

  const cards = steps
    .map(
      (step) => `
        <article class="step-card">
          <div class="step-top">
            <strong>${step.order}. ${escapeHtml(step.event.name)}</strong>
            <span class="step-badge ${step.accepted ? "take" : "skip"}">${step.accepted ? "TAKE" : "SKIP"}</span>
          </div>
          <p class="step-meta">
            Predicted score ${step.eventScore}, cost ${formatBudget(step.event.cost)}, staff ${step.event.staffRequired}, equipment ${step.event.equipmentRequired}.
            ${escapeHtml(step.reason)}
          </p>
        </article>
      `,
    )
    .join("");

  return `
    <div class="step-group">
      <h3>${escapeHtml(title)}</h3>
      ${cards}
    </div>
  `;
}

export function createGreedyStepsMarkup(greedyBudgetResult, greedyScheduleResult) {
  return `
    ${createStepColumnMarkup("Advanced greedy budget seed", greedyBudgetResult.steps)}
    ${createStepColumnMarkup("Greedy finish-time baseline", greedyScheduleResult.steps)}
  `;
}

function createScenarioCards(cards, formatter) {
  return cards
    .map(
      (item) => `
        <article class="scenario-card">
          <p class="section-tag">${escapeHtml(formatter.kicker)}</p>
          <strong>${escapeHtml(item.event.name)}</strong>
          <p>${escapeHtml(formatter.description(item))}</p>
          <p class="scenario-score">${escapeHtml(formatter.score(item))}</p>
          <p class="selection-subtext">${escapeHtml(item.note)}</p>
        </article>
      `,
    )
    .join("");
}

export function createWhatIfMarkup(whatIf) {
  return `
    <div class="scenario-stack">
      <article class="scenario-brief">
        <strong>Best configuration suggestion</strong>
        <p>${escapeHtml(whatIf.bestNarrative)}</p>
      </article>
      <div class="scenario-group">
        <h3>Remove-event stress test</h3>
        <div class="scenario-grid">
          ${createScenarioCards(whatIf.removalImpacts, {
            kicker: "removal simulation",
            description: (item) => `${item.event.name} removed from the model.`,
            score: (item) => `Next score ${item.nextScore} | delta ${item.delta}`,
          })}
        </div>
      </div>
      <div class="scenario-group">
        <h3>Add-event unlock test</h3>
        <div class="scenario-grid">
          ${createScenarioCards(whatIf.additionImpacts, {
            kicker: "addition simulation",
            description: (item) =>
              item.unlocked
                ? `Expanded resources unlock ${item.event.name}.`
                : `${item.event.name} still loses to a better combination even after expansion.`,
            score: (item) => `Next score ${item.nextScore} | delta ${item.delta}`,
          })}
        </div>
      </div>
    </div>
  `;
}
