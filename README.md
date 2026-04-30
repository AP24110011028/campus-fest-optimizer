# CampusFest Optimizer Pro

CampusFest Optimizer Pro is a frontend-based decision support platform for college festival planning under realistic operational constraints. The system integrates dynamic programming, advanced greedy heuristics, predictive scoring, multi-stage scheduling, and explainability features into a single browser-accessible application.

Rather than functioning as a simple algorithm showcase, the project is designed to model a realistic planning environment in which funding, staffing, equipment availability, stage capacity, and event timing must be evaluated together before a final event plan is approved.

## Project Objective

The objective of this project is to identify the most valuable festival configuration from a pool of candidate events while respecting limited institutional resources. The system evaluates events not only by raw impact, but also by operational cost, demand tendency, resource consumption, and schedule compatibility.

The application is intended to answer questions such as:

- Which events should be funded under the available budget?
- How should staff and equipment constraints affect selection?
- Which scheduling strategy produces the highest total value?
- Where does a greedy heuristic fail compared with dynamic programming?
- What adjustments are recommended when a funded event cannot be placed on any stage?

## Key Capabilities

- Multi-constraint event selection using dynamic programming across budget, staff, and equipment limits
- Advanced greedy heuristic using predicted value against cost, duration, and resource usage
- Hybrid optimization flow in which greedy provides an initial solution and dynamic programming refines it
- Predictive event scoring based on impact, priority, and simulated demand trend
- Weighted interval scheduling as a reference model for single-stage value optimization
- Multi-stage schedule optimization for maximizing total value across available stages
- Overflow recovery suggestions when funded events cannot be scheduled directly
- What-if simulation engine for budget changes, event removal, and event unlock scenarios
- Explainability through decision traces, comparison views, and recommendation panels
- Responsive frontend interface with local persistence and custom event support

Collectively, these capabilities position the application as a practical planning assistant rather than a static academic demo.

## Optimization Model

Each event is evaluated using the following predictive scoring model:

```text
predictedScore = (impact x trendFactor) + (priority x priorityWeight)
```

Where:

- `impact` represents the base value or attraction potential of the event
- `trendFactor` represents simulated demand based on category, timing, and operational characteristics
- `priorityWeight` allows higher-priority events to gain additional institutional importance

This model makes the optimizer more realistic than a fixed-score system because audience interest is not assumed to remain constant across all events.

## Algorithmic Components

### 1. Multi-Constraint Dynamic Programming

The funding engine uses a multi-dimensional knapsack-style dynamic programming model. Instead of optimizing only against budget, the planner evaluates three resource dimensions simultaneously:

- budget
- staff required
- equipment required

The objective is to maximize total predicted score while remaining within all three limits.

To remain practical in a browser environment, the implementation includes:

- rolling-array space optimization
- adaptive scaling when the exact state space becomes too large
- reconstruction support for explainability

This allows the planner to preserve high-quality optimization behaviour while remaining responsive for larger input sizes.

### 2. Advanced Greedy Heuristic

The greedy baseline has been strengthened from a simple `score / cost` rule to a more realistic density function:

```text
predictedScore / (cost x duration x resourceUsage)
```

Where:

- `duration` reflects schedule occupation
- `resourceUsage` reflects combined staff and equipment demand

This heuristic is intentionally fast and intuitive, but it does not guarantee global optimality. It is therefore used as a seed solution and comparison baseline rather than the final decision authority.

### 3. Hybrid Greedy + DP Refinement

The planner now supports a hybrid optimization flow:

1. Greedy produces a fast initial feasible lineup.
2. Dynamic programming refines that lineup by exploring stronger global combinations.

This approach demonstrates both practical heuristic planning and exact optimization within the same decision-support workflow.

### 4. Weighted Interval Scheduling

Weighted interval scheduling remains part of the system as a reference dynamic programming model for single-stage optimization.

It is useful because it clearly demonstrates how:

- overlapping events are handled
- event value is prioritized over event count
- dynamic programming improves on a basic finish-time greedy baseline

Although the system now supports multi-stage scheduling, this single-stage model remains valuable for explanation, comparison, and viva discussion.

### 5. Multi-Stage Scheduling Optimization

The scheduling layer has been upgraded from a simple greedy placement strategy to a flow-based multi-stage optimizer. This model selects the best set of stage assignments across multiple lanes while minimizing conflict and reducing idle waste where possible.

This allows the system to move from:

- “place events wherever they fit”

to:

- “find the highest-value arrangement across all stages”

### 6. Overflow Recovery Suggestions

When a funded event cannot be scheduled directly, the system provides fallback recommendations such as:

- shifting the event into a compatible time gap
- moving the event to a less loaded stage
- reducing the duration so that it can fit into available capacity

This makes the platform more operationally useful and moves it beyond pure algorithm comparison.

### 7. What-If Simulation Engine

The application supports scenario-based analysis by simulating:

- changes in budget
- removal of selected events
- unlocking of currently excluded events under expanded resources

For each simulation, the system reports:

- score change
- next best configuration
- strategic interpretation of the result

## Why Dynamic Programming Outperforms Greedy

Greedy algorithms are valuable because they are fast, easy to explain, and often provide a good first approximation. However, they rely on local decision rules and cannot always see the global consequence of an early choice.

Dynamic programming is stronger in this project because:

- one expensive event may block two medium-value events that together are better
- a lower-cost event may unlock a superior resource combination
- budget alone is no longer the only bottleneck
- staff and equipment constraints can completely change the best solution

As a result, the project presents a realistic and academically meaningful contrast:

- greedy is efficient and intuitive
- dynamic programming is globally optimal within the modeled state space

## Performance Considerations

The optimization engine was designed to remain efficient for larger event sets. The implementation includes:

- memoized scoring logic
- cached scenario evaluation for what-if analysis
- rolling dynamic programming arrays to control memory usage
- adaptive scaling to keep high-dimensional optimization tractable

In practice, this enables the system to handle larger scenarios while preserving responsive browser-based performance.

## Time Complexity Overview

### Multi-Constraint Funding DP

- Approximate worst-case form: `O(n x B x S x E)`
- `n` = number of active events
- `B` = budget capacity
- `S` = staff capacity
- `E` = equipment capacity

When the state space becomes too large, adaptive scaling reduces the effective grid size.

### Advanced Greedy Selection

- Sorting: `O(n log n)`
- Selection pass: `O(n)`

### Weighted Interval Scheduling

- Sorting and predecessor lookup: `O(n log n)`
- DP computation: `O(n)`

### Multi-Stage Scheduling

The stage optimizer is built on a compact time-expanded flow network. In practice, performance remains efficient because:

- the number of stage lanes is small
- the number of time boundaries is limited by the event set

## System Architecture

The codebase is modularized into the following layers:

### `models/`

Contains:

- configuration values
- presets
- sample event data
- event normalization rules

### `utils/`

Contains:

- formatting helpers
- time utilities
- storage utilities
- shared helper functions

### `algorithms/`

Contains:

- predictive scoring logic
- multi-constraint budget optimization
- greedy budget heuristic
- weighted interval scheduling
- multi-stage scheduling
- what-if simulation
- top-level analysis composition

### `ui/`

Contains:

- rendering templates
- application wiring
- dashboard updates
- report generation support

## User-Facing Features

- Responsive dashboard for optimization analysis
- Adjustable controls for budget, staff, equipment, stages, and priority weight
- Category filtering and minimum-priority filtering
- Preset-based showcase scenarios
- Custom event addition and removal
- Local browser persistence using `localStorage`
- Side-by-side optimizer comparison
- Stage utilization and overflow visualization
- DP trace table and greedy decision log
- What-if simulation cards and recommendation panels
- Exportable markdown report
- Built-in help desk for first-time users

## Files and Structure

- `index.html`
- `styles.css`
- `script.js`
- `models/config.js`
- `models/events.js`
- `utils/helpers.js`
- `utils/time.js`
- `utils/format.js`
- `utils/storage.js`
- `algorithms/scoring.js`
- `algorithms/budget.js`
- `algorithms/scheduling.js`
- `algorithms/simulation.js`
- `algorithms/analysis.js`
- `ui/templates.js`
- `ui/app.js`

## Running the Project

Run the project locally with:

```bash
python3 -m http.server 8000
```

Then open:

- `http://127.0.0.1:8000/index.html`

## Academic Value

This project is well suited for academic presentation because it demonstrates:

- practical use of dynamic programming
- contrast between heuristic and exact methods
- scheduling optimization under real constraints
- explainability of algorithmic decisions
- software engineering through modular frontend architecture

It can therefore be presented not only as a web interface, but as a structured optimization framework for intelligent festival planning and algorithmic decision analysis.

## Future Enhancements

- probabilistic demand forecasting using historical attendance data
- export to PDF and spreadsheet formats
- scenario history and comparative benchmarking
- richer visualization of stage conflicts and recovery options
- role-based operational planning for volunteers, judges, and logistics teams
