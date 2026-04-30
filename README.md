# CampusFest Optimizer Pro

CampusFest Optimizer Pro is a frontend-only intelligent decision support system for college-festival planning. It keeps the simplicity of a browser project, but the optimization layer is now strong enough to behave like a real planning engine instead of a basic algorithm demo.

## What the upgraded system does

The planner now optimizes across three different kinds of decisions:

1. **Funding**
   It decides which events should be funded under multiple resource limits.

2. **Scheduling**
   It decides which funded events should actually occupy the available stage lanes.

3. **Operational recovery**
   If a funded event cannot be scheduled, it suggests how to recover it by shifting time, moving stages, or reducing duration.

## Core algorithms

### 1. Multi-Constraint Dynamic Programming

The old single-budget knapsack has been upgraded into a **three-constraint knapsack**.

Each event now consumes:

- `cost`
- `staffRequired`
- `equipmentRequired`

The planner maximizes:

```text
predictedScore = (impact x trendFactor) + (priority x priorityWeight)
```

This DP is implemented as a **3D resource optimizer** over:

- budget
- staff
- equipment

To keep the browser responsive for larger scenarios, the solver uses:

- rolling-array DP to reduce space usage
- adaptive scaling when the state space becomes too large

### 2. Advanced Greedy Seed

The old greedy ratio:

```text
score / cost
```

was replaced by:

```text
predictedScore / (cost x duration x resourceUsage)
```

where:

- `duration` comes from the event timeline
- `resourceUsage = staffRequired + equipmentRequired`

This greedy step is not the final answer. It is used as a **fast seed solution**, and then DP refines that seed into the final optimized lineup.

### 3. Predictive Scoring

The original score model was:

```text
impact + (priority x weight)
```

The upgraded model uses:

```text
predictedScore = (impact x trendFactor) + (priority x weight)
```

`trendFactor` is rule-based and depends on:

- category popularity
- time-of-day demand
- priority level
- duration penalty for long low-agility blocks

This makes the planner more realistic because it no longer assumes every impact value is static.

### 4. Weighted Interval Scheduling Reference

The system still keeps **single-stage weighted interval scheduling** as an explainability layer.

This is useful because:

- it is easy to explain in viva
- it shows how value-aware scheduling works on one stage
- it acts as a clean DP reference even though the main planner now schedules across multiple stages

### 5. Multi-Stage Scheduling Optimization

The stage scheduler is now upgraded from greedy placement to a **flow-based multi-stage optimizer**.

It:

- chooses the highest-value set of funded events across all available stages
- respects overlap limits automatically
- reduces idle gaps as a secondary objective

This is stronger than simple stage placement because it optimizes the schedule globally, not one event at a time.

### 6. What-If Simulation Engine

The app now simulates:

- budget changes
- removing important events
- unlocking additional events by expanding resources

The output explains:

- score change
- next best configuration
- which event is the strongest upgrade lever

## Why DP beats greedy here

Greedy is fast, but it makes decisions using only local information.

That is dangerous when:

- one expensive event blocks two medium-value events
- a low-resource event unlocks a stronger full combination
- staff or equipment become the true bottleneck instead of money

Dynamic programming is better in these cases because it explores combinations across the whole resource space.

In this project:

- **advanced greedy** gives a quick seed
- **DP** gives the best feasible lineup
- **multi-stage optimization** turns the funded lineup into the strongest schedule

## Performance strategy

The upgraded system is designed to remain usable for larger datasets:

- rolling DP arrays reduce memory pressure
- adaptive scaling prevents state explosion
- score computation is memoized
- scenario analysis is cached during what-if runs
- the browser only recomputes the scenarios that actually change

## Time complexity summary

### Multi-constraint funding DP

- Exact mode: `O(n x B x S x E)`
- with:
  - `n` = number of active events
  - `B` = budget limit
  - `S` = staff limit
  - `E` = equipment limit

When the exact grid becomes too large, the solver uses adaptive scaling to keep runtime practical.

### Advanced greedy seed

- sorting: `O(n log n)`
- selection scan: `O(n)`

### Weighted interval scheduling

- sorting and predecessor search: `O(n log n)`
- DP scan: `O(n)`

### Multi-stage flow schedule

- built on a small time-expanded network
- practical runtime stays efficient for 100+ events because the number of stage lanes is small and time points are limited

### What-if engine

- reuses memoized scenario evaluation
- avoids recomputing identical states

## Architecture

The code is now modularized into:

- `models/`
  - configuration
  - sample event data
  - normalization rules

- `utils/`
  - formatting
  - time helpers
  - shared helpers
  - local storage state

- `algorithms/`
  - predictive scoring
  - multi-constraint budget optimization
  - greedy baselines
  - weighted interval scheduling
  - multi-stage scheduling
  - what-if simulation
  - top-level analysis composition

- `ui/`
  - rendering templates
  - event wiring
  - report export
  - help interactions

## Main features

- multi-constraint budget optimization
- advanced greedy seed plus DP refinement
- predictive event scoring with trend factor
- multi-stage schedule optimization
- weighted interval reference trace
- greedy decision log
- overflow recovery suggestions
- budget sensitivity ladder
- remove-event stress simulation
- add-event unlock simulation
- recommendation cards
- localStorage persistence
- custom event creation
- preset-driven demo modes
- built-in help center
- exportable markdown report

## How to run

Start a local server in the project folder:

```bash
python3 -m http.server 8000
```

Then open:

- [http://127.0.0.1:8000/index.html](http://127.0.0.1:8000/index.html)

## Project structure

- [index.html](/Users/appidipoojitha/Desktop/ccc/index.html)
- [styles.css](/Users/appidipoojitha/Desktop/ccc/styles.css)
- [script.js](/Users/appidipoojitha/Desktop/ccc/script.js)
- [models/config.js](/Users/appidipoojitha/Desktop/ccc/models/config.js)
- [models/events.js](/Users/appidipoojitha/Desktop/ccc/models/events.js)
- [utils/helpers.js](/Users/appidipoojitha/Desktop/ccc/utils/helpers.js)
- [utils/time.js](/Users/appidipoojitha/Desktop/ccc/utils/time.js)
- [utils/format.js](/Users/appidipoojitha/Desktop/ccc/utils/format.js)
- [utils/storage.js](/Users/appidipoojitha/Desktop/ccc/utils/storage.js)
- [algorithms/scoring.js](/Users/appidipoojitha/Desktop/ccc/algorithms/scoring.js)
- [algorithms/budget.js](/Users/appidipoojitha/Desktop/ccc/algorithms/budget.js)
- [algorithms/scheduling.js](/Users/appidipoojitha/Desktop/ccc/algorithms/scheduling.js)
- [algorithms/simulation.js](/Users/appidipoojitha/Desktop/ccc/algorithms/simulation.js)
- [algorithms/analysis.js](/Users/appidipoojitha/Desktop/ccc/algorithms/analysis.js)
- [ui/templates.js](/Users/appidipoojitha/Desktop/ccc/ui/templates.js)
- [ui/app.js](/Users/appidipoojitha/Desktop/ccc/ui/app.js)
