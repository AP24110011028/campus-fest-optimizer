# CampusFest Optimizer Pro

CampusFest Optimizer Pro is a capstone-style client-side decision system for planning a college festival under real constraints. It stays frontend-only, but the logic is significantly deeper than a typical static project.

The app combines:

- **0/1 Knapsack Dynamic Programming** for budget allocation
- **Weighted Interval Scheduling Dynamic Programming** for high-value single-stage planning
- **Greedy ratio selection** as a fast budget baseline
- **Greedy earliest-finish scheduling** as a fast scheduling baseline
- **Greedy multi-stage lane allocation** for placing funded events across limited stages

## Why this is capstone-level

This project is no longer just a basic webpage that displays algorithm output. It behaves like a small optimization platform:

- multiple real constraints are modeled together
- algorithms are compared side by side
- every choice is explainable through trace tables and decision logs
- the planner supports custom scenarios and saved local state
- scenario presets make the demo easier to present live
- a built-in help desk supports first-time users inside the app
- the UI presents results as a product, not as a single demo card

## Core workflow

The system runs in four layers:

1. Filter the proposal pool by category and minimum priority.
2. Use **Knapsack DP** to fund the best set of events under the budget.
3. Compare that optimal funded lineup with a **greedy ratio-based budget heuristic**.
4. Run **Weighted Interval Scheduling DP** on the funded lineup to get the best single-stage value plan, compare it to the **earliest-finish greedy schedule**, and finally place funded events across multiple lanes using a greedy stage allocator.
5. Run a **what-if budget ladder** to show how the DP and greedy gap changes as the budget changes.
6. Export a planner report for submission or presentation support.

## Algorithms used

### 1. 0/1 Knapsack Dynamic Programming

Used for budget optimization.

- Each event has a `cost`
- Each event has an `impact`
- Each event has a `priority`
- The optimization score is:

```text
score = impact + (priority x priorityWeight)
```

Goal:

- maximize total score
- do not exceed the given budget

Time complexity:

- `O(nB)` where `n` is the number of active events and `B` is the budget limit

### 2. Weighted Interval Scheduling Dynamic Programming

Used for the main-stage value plan.

- Events have start and end times
- Overlapping events cannot coexist on one main stage
- Each event has a value score

Goal:

- maximize total schedule score on a single stage

Time complexity:

- sorting and predecessor search: `O(n log n)`
- DP scan: `O(n)`
- overall: `O(n log n)`

### 3. Greedy Ratio Budget Heuristic

Used as a fast baseline.

- Sort events by `score / cost`
- Keep picking while budget remains

Why it matters:

- it is fast
- it is intuitive
- it is not always optimal

### 4. Greedy Earliest-Finish Scheduling

Used as a fast baseline for single-stage planning.

- Sort funded events by finish time
- Always keep the next event that does not overlap

Why it matters:

- great when the goal is maximizing the **count** of compatible events
- not always best when the real goal is maximizing **value**

### 5. Greedy Multi-Stage Allocation

Used to place funded events across a fixed number of stages.

- Events are processed by start time
- Each event is placed into the best currently available stage lane
- If no stage is free, the event becomes overflow

This helps simulate real operational planning even after budget selection is complete.

## Features

- polished responsive interface
- category filters
- adjustable budget, stage count, and priority weight
- minimum-priority filtering
- custom event creation
- localStorage persistence
- scenario presets for different demo modes
- built-in help center with step-by-step usage guidance
- side-by-side DP and greedy comparisons
- score comparison chart
- what-if budget sensitivity ladder
- generated planner recommendations
- multi-stage lane visualization
- knapsack matrix view
- weighted interval scheduling trace table
- greedy decision logs
- markdown report export

## Files

- [index.html](/Users/appidipoojitha/Desktop/ccc/index.html)
- [styles.css](/Users/appidipoojitha/Desktop/ccc/styles.css)
- [script.js](/Users/appidipoojitha/Desktop/ccc/script.js)
- [README.md](/Users/appidipoojitha/Desktop/ccc/README.md)

## How to run

You can open [index.html](/Users/appidipoojitha/Desktop/ccc/index.html) directly in the browser, but the easiest option is a local server:

```bash
python3 -m http.server 8000
```

Then open:

- `http://127.0.0.1:8000/index.html`

## Suggested project description

> CampusFest Optimizer Pro is a frontend-only optimization platform for festival planning. It uses 0/1 Knapsack Dynamic Programming to choose the highest-value set of events within a fixed budget, Weighted Interval Scheduling Dynamic Programming to maximize single-stage schedule value, greedy heuristics for fast baseline comparisons, and a greedy multi-stage allocator to place funded events across limited stages. The project demonstrates how different algorithmic paradigms solve different layers of a real planning problem.

## Good viva explanation

You can explain the project in one short flow:

1. First, I filter the available proposals.
2. Then I use knapsack DP to decide which events should be funded under budget.
3. After funding, I compare greedy and DP again for time scheduling.
4. Weighted interval scheduling gives the best value main-stage plan.
5. Finally, I place funded events across limited stage lanes and detect overflow.

## Future upgrades

- add export to PDF or CSV
- add multiple resource constraints such as staff and equipment
- add side-by-side preset comparison history
- add chart history across different budgets
- add Monte Carlo style demand simulation for uncertain attendance
