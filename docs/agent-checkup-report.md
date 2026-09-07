# Agent Checkup Report

Generated: 2026-09-06

## Outcome

- System type: `swarm`
- Agent mode: `llm` for browser integration; deterministic for unit tests
- Baseline official-MCP browser completion rate: 0/1 (agent timeout)
- Corrected official-MCP browser completion rate: 1/1 (100%)
- Improvement: +100 percentage points
- Best variant: official evaluator-only MCP with a 420-second role deadline
- Fixed cases: 2 (custom MCP dependency and official-MCP timeout)
- Top failure category: `tool_or_retrieval_failure`
- W&B run: not used; evaluation was local

## Commands and checks

- Official evaluator smoke test: `WolframLanguageEvaluator` evaluated `2+2`
- `python3 -m unittest discover -s . -p 'test_*.py' -v`
- `node --check static/app.js`
- `node --check static/archive.js`
- `git diff --check`
- `run_agent_qa.py --repo . --cases 8 --system-type swarm --agent-mode deterministic`
- Two browser attempts through Explorer → Falsifier → Prover → Falsifier → Kernel Referee → archive

The generic Agent Checkup script did not detect a standalone eval command and
produced a scaffold. The repository's real deterministic harness is
`test_forge.py`; its 11 tests passed. No W&B result is claimed.

## Coordination health

Explorer, Falsifier, and Prover all invoked the official `WolframLanguage`
server through its `WolframLanguageEvaluator` tool. Telemetry correctly parsed
the official structured MCP response, counted calls, displayed Wolfram input
and output, and omitted MCP session reminders. Prompts restrict computation to
the evaluator and forbid filesystem, process, environment, network, and
notebook operations.

The first browser attempt exposed a four-minute role timeout during a heavier
Falsifier search. Raising the deadline to 420 seconds fixed the failure without
changing mathematical budgets or weakening required tool checks.

## Final browser verification

The successful run proposed a Fibonacci congruence primality test, found the
smallest composite passer $4181=37\cdot113$, repaired the conjecture into an
exact finite biconditional, and survived a second Falsifier pass. The Kernel
Referee independently launched a fresh `wolframscript` process and matched the
certificate. The archive immediately displayed the new certified entry with
its complete definition, conjecture, explanation, theorem, proof, 398,999 AI
tokens (Sol high), and 13 Wolfram MCP calls.

## Recommended next action

Add a small first-class deterministic eval command so generic agent-checkup
tools can discover the existing test harness without project-specific knowledge.
