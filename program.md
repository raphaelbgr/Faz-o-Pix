# Faz-o-Pix Autonomous Development Loop

This is an autonomous development program inspired by [autoresearch](https://github.com/karpathy/autoresearch). Instead of training a neural network, the agent autonomously develops, tests, documents, and evolves a full-stack web application.

## Setup

To set up a new experiment run, work with the user to:

1. **Agree on a run tag**: propose a tag based on today's date (e.g. `mar24`). The branch `autodev/<tag>` must not already exist.
2. **Create the branch**: `git checkout -b autodev/<tag>` from current `development`.
3. **Read the codebase**: The repo has comprehensive docs. Read these for full context:
   - `README.md` — project overview
   - `docs/prd/mvp-complete.md` — MVP scope, all 18 stories across 4 epics
   - `docs/prd/functional-requirements.md` — detailed functional requirements (FR1-FR15)
   - `docs/TESTING.md` — testing infrastructure
   - `backend/src/` — Fastify + TypeScript + Prisma backend
   - `frontend/src/` — Next.js 14 + React 18 + Tailwind frontend
   - `shared/` — shared TypeScript types
4. **Assess current state**: Run the test suite and note what passes/fails. Check which stories from the PRD are implemented vs. missing.
5. **Initialize results.tsv**: Create `results.tsv` with the header row. The baseline will be recorded after the first assessment.
6. **Confirm and go**: Confirm setup looks good.

Once you get confirmation, kick off the development loop.

## The Metric

The composite score is:

```
score = tests_passing / tests_total
```

Additionally track:
- `build_ok`: does `npm run build` succeed for both backend and frontend? (boolean)
- `tests_passing`: number of test cases passing
- `tests_total`: total test cases
- `edge_cases_added`: cumulative count of new edge-case tests added this run

The goal is simple: **get score to 1.0 (100% tests passing) with maximum edge case coverage, then research and implement new features, then repeat.**

## What you CAN do

- Modify any file in `backend/src/`, `frontend/src/`, `shared/`
- Add new test files in `backend/src/tests/`
- Add new components, routes, services, schemas
- Read any documentation in `docs/` for context
- Run shell commands: `npm test`, `npm run build`, `npx prisma migrate dev`, etc.

## What you CANNOT do

- Modify files in `docs/prd/` — those are the source-of-truth requirements. Read-only.
- Delete or weaken existing tests to make the score go up. Tests can only be added or fixed if they have genuine bugs.
- Skip edge cases. If you find an untested path, you must add a test for it.
- Install major new dependencies without justification in the commit message.

## Phases

The agent cycles through phases automatically. Each phase has a clear exit condition.

### Phase 1: STABILIZE
**Goal**: Get all existing tests passing. Fix bugs, not tests.
**Exit condition**: `score == 1.0` (all tests pass) AND `build_ok == true`
**Strategy**:
1. Run `cd backend && npm test 2>&1 | tail -50` to see current failures
2. Run `cd frontend && npm run build 2>&1 | tail -30` to check build
3. Pick one failing test, read the test and the source code it exercises
4. Fix the source code (not the test, unless the test itself has a bug)
5. Run tests again to verify
6. Commit, log result, continue until all green

### Phase 2: HARDEN
**Goal**: Add edge-case tests for all implemented features. Find and fix bugs they expose.
**Exit condition**: Every endpoint and service function has tests for: valid input, invalid input, boundary values, auth failures, concurrent access, and error paths.
**Strategy**:
1. Read each route file and service file
2. For each function, check what tests exist
3. Add missing edge-case tests (at least 3 per function: happy path, bad input, auth boundary)
4. If a new test fails, fix the code (this is a real bug you found)
5. Commit, log result, continue

### Phase 3: DOCUMENT
**Goal**: Ensure code has clear inline documentation where logic is non-obvious. Update any stale docs.
**Exit condition**: All complex business logic (balance calculator, debt simplification, split algorithms, validation) has inline comments explaining the "why".
**Strategy**:
1. Read through services and complex logic
2. Add concise comments only where the intent isn't obvious from the code
3. If you find docs that contradict the code, the code is the source of truth (update the doc in `docs/` only if outside `docs/prd/`)
4. Commit, log result, continue

### Phase 4: RESEARCH
**Goal**: Identify the highest-impact unimplemented features from the PRD and the "next steps" in README.md.
**Exit condition**: A prioritized list of 3-5 features to implement next, written to `research-notes.md`.
**Strategy**:
1. Re-read `docs/prd/functional-requirements.md` and `docs/prd/stories/` for unimplemented stories
2. Re-read `README.md` "next steps" section
3. Compare against what exists in the codebase
4. Prioritize by: impact (user value) > complexity (simpler first) > dependencies (unblocked first)
5. Write findings to `research-notes.md` with rationale
6. Commit, log result, continue to Phase 5

### Phase 5: IMPLEMENT
**Goal**: Implement the top-priority feature from Phase 4 research.
**Exit condition**: Feature is implemented with tests passing, edge cases covered.
**Strategy**:
1. Read the relevant story doc from `docs/prd/stories/`
2. Implement backend first (route, schema, service, tests)
3. Implement frontend second (components, pages, API integration)
4. Write tests as you go — TDD style when possible
5. Run full test suite after each significant change
6. Commit after each working increment
7. Log result, then pick the next feature from the research list

### Phase 6: LOOP
After Phase 5 completes all researched features, return to Phase 1 (STABILIZE) to ensure nothing broke, then Phase 2 (HARDEN) the new code, then Phase 4 (RESEARCH) again for the next batch.

**The cycle is: STABILIZE -> HARDEN -> DOCUMENT -> RESEARCH -> IMPLEMENT -> repeat**

## Output format

After each action (test run, build, feature implementation), note the result:

```
phase:            STABILIZE
action:           fix auth route 500 on missing password field
tests_passing:    85
tests_total:      120
build_ok:         true
edge_cases_added: 0
```

## Logging results

When an experiment step is done, log it to `results.tsv` (tab-separated).

The TSV has a header row and 7 columns:

```
commit	phase	tests_passing	tests_total	build_ok	status	description
```

1. git commit hash (short, 7 chars)
2. phase: STABILIZE, HARDEN, DOCUMENT, RESEARCH, IMPLEMENT
3. tests_passing (integer)
4. tests_total (integer)
5. build_ok: true/false
6. status: `keep`, `discard`, or `crash`
7. short text description of what this step did

Example:

```
commit	phase	tests_passing	tests_total	build_ok	status	description
a1b2c3d	STABILIZE	85	120	true	keep	baseline assessment
b2c3d4e	STABILIZE	90	120	true	keep	fix auth validation null check
c3d4e5f	HARDEN	95	125	true	keep	add edge cases for CPF validation
d4e5f6g	IMPLEMENT	100	130	true	keep	add settlement recording endpoint
```

## The experiment loop

LOOP FOREVER:

1. Check the current phase and its exit condition
2. Pick the next action for the current phase
3. Make the code change
4. git commit with descriptive message
5. Run tests: `cd backend && npm test 2>&1 > test.log; tail -5 test.log`
6. Run build check: `cd frontend && npm run build 2>&1 > build.log; echo $?`
7. Read out the results
8. Record in results.tsv (do NOT commit results.tsv — leave it untracked)
9. If tests improved or stayed same AND build passes: keep the commit
10. If tests regressed: `git reset --hard HEAD~1` (discard), log as "discard"
11. If the phase exit condition is met, advance to the next phase
12. Continue

## Critical rules

**NEVER STOP**: Once the loop has begun, do NOT pause to ask the human if you should continue. The human might be asleep and expects you to work indefinitely until manually stopped. You are autonomous. If you run out of ideas in one phase, move to the next. If all phases are done, loop back. If truly stuck, write your analysis to `research-notes.md` and try a different approach.

**KEEP/DISCARD discipline**: Never let the codebase regress. If a change breaks more tests than it fixes, discard it immediately. The branch should only move forward.

**Simplicity criterion**: All else being equal, simpler is better. Don't add complexity for marginal gains. A small fix that removes code is better than a large fix that adds code. Don't over-engineer — build what the PRD asks for, cleanly.

**Commit often**: Small, focused commits. One logical change per commit. This makes discard/revert cheap and the git history readable.

**Test everything**: No feature is done until it has tests. No bug fix is done until it has a regression test.
