# sim_ui/AGENTS.md

## Purpose

This directory contains the UI for the Legacy combat simulator.

Primary goal:
- Build a simple, fast, icon-first simulator UI.
- Preserve existing simulator behavior and data flow.
- Improve usability and iteration speed for testing builds.

## UI-first rules

When editing files under `sim_ui/`:

- Prefer simplifying interaction flows over preserving existing layout.
- Favor icon-first communication over text-heavy presentation.
- Favor direct manipulation:
  - click slot to target it
  - click item/crystal to apply it
  - click equipped crystal to remove it
- Keep the default page focused on the main workflow:
  - pick builds
  - adjust stats/style
  - edit equipment/crystals
  - run
  - inspect results if needed
- Hide secondary information until requested.
- Prefer fewer, stronger surfaces over many nested cards/panels/drawers.

## Do preserve

- simulator math/behavior
- request/response contracts
- persistence/state shape unless explicitly needed
- attackStyle wiring
- result plumbing
- slot/item/crystal/upgrade application behavior

## Do not

- touch brute-sim from UI tasks
- preserve awkward UI structure just because it already exists
- over-explain with helper text
- make build browsing name-heavy
- introduce giant popup editors unless explicitly requested
- add new UI dependencies unless clearly justified

## Design preferences

- Optimize for laptop/desktop first
- Keep the page compact and visually calm
- Use build/item/crystal icons as primary identity
- Use hover/tooltips/details for secondary info
- Treat the in-game sim as inspiration for interaction, not styling

## Preferred workflow

For medium or large UI changes:
1. identify the core user task
2. simplify the visible UI around that task
3. preserve behavior underneath
4. verify typecheck/build
5. summarize what changed and what got simpler