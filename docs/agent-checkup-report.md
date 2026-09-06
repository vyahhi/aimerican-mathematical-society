# Agent Checkup Report

Generated: 2026-09-06

## Outcome

- System type: `swarm`
- Agent mode: `llm`
- Browser runs completed: 2
- Certification completion rate: 2/2 (100%)
- Baseline archive-quality pass rate: 0/1 (0%)
- Corrected archive-quality pass rate: 1/1 (100%)
- Improvement: +100 percentage points
- Best variant: object-scoped Prover prompt with conditional Euler hint
- Fixed cases: 4 (one new run and three contaminated legacy archive records)
- Top failure category: `agent_coordination_failure`
- W&B run: not used; evaluation was local

## Commands and checks

- `python3 -m unittest -v test_forge.py`
- `python3 .../agent-checkup/scripts/run_agent_qa.py --repo . --cases 8 --system-type swarm --agent-mode deterministic`
- Two real browser launches through Explorer → Falsifier → Prover → Falsifier → Kernel Referee → archive

## Coordination health

Agent handoffs, Wolfram MCP calls, token accounting, certificate execution, archive persistence, and dynamic archive refresh all succeeded. The baseline Prover mixed an unrelated Euler-polynomial result into other objects because its prompt always mentioned that demo repair. The hint is now injected only when the Explorer actually defines $n^2+n+41$; regression tests cover both the matching and nonmatching paths.

## Final browser verification

The corrected run researched consecutive Bell numbers, certified the finite theorem through $n=4999$, and immediately added it to All Conjectures with its definition, original conjecture, plain-English explanation, divider, proof, certificate, status, 407,125 AI tokens (Sol high), and 15 Wolfram MCP calls. No unrelated theorem appeared.

## Recommended next action

Add a generic post-generation scope validator that compares symbols and named objects in the Explorer definition against the Prover theorem before certification.
