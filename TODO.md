# Roadmap Toward Mathematical Breakthroughs

The current society is strong at producing compelling demonstrations, but its
main loop optimizes for finding, breaking, repairing, and quickly certifying an
individual conjecture. The next stage should optimize for novelty, depth,
explanation, and cumulative progress across many research sessions.

## 1. Persistent research programs

- [ ] Maintain several long-lived programs, initially covering number theory,
  combinatorics, recurrences, and graph theory.
- [ ] Persist unresolved questions, partial lemmas, failed approaches,
  counterexamples, and proposed next experiments.
- [ ] Make each session advance an existing program when useful instead of
  always starting from zero.
- [ ] Represent every program as a research tree:

```text
Research question
├── Known results
├── Computational evidence
├── Lemmas proved
├── Counterexamples
├── Open subproblems
└── Next experiments
```

## 2. Literature and novelty referee

- [ ] Add a Literature Referee that checks arXiv, OEIS, MathOverflow, published
  papers, and standard references before a result is presented as new.
- [ ] Save citations and the queries used to find them.
- [ ] Assign each result one of these novelty labels:
  - `KNOWN RESULT`
  - `EASY CONSEQUENCE`
  - `NEW COMPUTATIONAL BOUND`
  - `PLAUSIBLY NOVEL LEMMA`
  - `PLAUSIBLY NOVEL THEOREM`
- [ ] Require human review before making a public novelty claim.

## 3. Replace instant repair with explanation

- [ ] Add a Mechanist agent between the Falsifier and Prover.
- [ ] Ask it to identify the invariant, obstruction, symmetry, recurrence,
  modular structure, or infinite family behind each counterexample.
- [ ] Prefer the strongest natural corrected statement over a theorem that only
  shrinks the checked finite range.
- [ ] Score repairs for explanatory structure and generality.

Questions the Mechanist must answer:

- What controls the phenomenon?
- Does the failure belong to an infinite family?
- Is there a hidden group, recurrence, symmetry, or modular obstruction?
- What is the strongest natural corrected statement suggested by the failure?

## 4. Maintain a conjecture and lemma graph

- [ ] Store definitions, lemmas, conjectures, counterexamples, computations,
  proofs, and citations as linked objects.
- [ ] Require every theorem to reference its mathematical dependencies.
- [ ] Detect when separate programs reuse the same obstruction or proof method.
- [ ] Let agents combine compatible lemmas into stronger candidate theorems.
- [ ] Add a graph view to the archive UI.

## 5. Add formal proof targets

- [ ] Integrate Lean or Isabelle for final logical verification.
- [ ] Use Wolfram for discovery, exact computation, identities, and finite
  certificates.
- [ ] Use Codex to translate the proof strategy into formal statements.
- [ ] Keep the independent Kernel Referee for recomputing finite components.
- [ ] Track proof assurance with separate labels:
  - `COMPUTATIONALLY CERTIFIED`
  - `FORMALLY PROVED`
  - `NOVELTY REVIEWED`
- [ ] Verify that every quantified claim in the reader-facing theorem is covered
  by either the formal proof or an explicitly scoped certificate.

## 6. Create a portfolio selection system

- [ ] Generate many inexpensive research proposals before beginning a costly
  full society run.
- [ ] Add a Research Director that allocates compute to the most promising
  candidates.
- [ ] Rank proposals by:
  - Mathematical naturalness
  - Novelty
  - Explanatory potential
  - Evidence strength
  - Tractability
  - Expected value of further computation
  - Connection to existing research programs
- [ ] Preserve rejected proposals so later discoveries can make them relevant.

## 7. Seek frontier-extending results

- [ ] Reduce the default preference for dramatic unrestricted conjectures.
- [ ] Explicitly target useful research outputs such as:
  - Improving a known verified bound
  - Finding the smallest unknown example
  - Classifying all exceptions within a family
  - Discovering a faster recurrence or algorithm
  - Proving a special case of an open conjecture
  - Finding an equivalence between two formulations
  - Extracting a human-readable pattern from a large exact computation
- [ ] Reward a legitimate new bound more highly than an unsupported universal
  claim.

## 8. Add independent competing societies

- [ ] Run isolated symbolic, experimental, formal-proof, adversarial, and
  literature teams on selected high-value problems.
- [ ] Hide intermediate conclusions between teams to preserve independence.
- [ ] Add an Editor agent that compares final reports and highlights agreement,
  contradictions, unsupported assumptions, and missing cases.
- [ ] Require independent reproduction before promoting a result.

## 9. Build reproducible experiment infrastructure

- [ ] Support resumable Wolfram research campaigns rather than only isolated
  evaluator calls.
- [ ] Add parameter sweeps, exact integer searches, symbolic classifications,
  counterexample minimization, sequence fingerprints, and asymptotic guessing.
- [ ] Store a manifest for every experiment containing:
  - Exact Wolfram code
  - Input parameters and domain
  - Result hash
  - Runtime and resource usage
  - Software versions
  - Coverage and uncovered regions
- [ ] Make archived experiments replayable by the Kernel Referee.

## 10. Introduce a breakthrough score

- [ ] Replace “produced something certifiable” as the main success signal.
- [ ] Score results using a multiplicative impact model:

```text
Impact =
  novelty confidence
  × theorem strength
  × proof confidence
  × explanatory value
  × connection to open mathematics
```

- [ ] Penalize finite-range retreats, rediscoveries, vague conjectures, hidden
  uncovered regions, and certificates that verify less than the prose claims.
- [ ] Use the score to choose follow-up work, not as evidence that a theorem is
  actually novel or important.

## 11. Make theorems less trivial

The current pipeline structurally encourages trivial theorems: Explorer creates
something breakable, Falsifier breaks it, and Prover can “succeed” by restricting
the claim to the tested finite range. Make “certified but mathematically
uninteresting” a rejected outcome.

### Add a non-triviality gate

- [ ] Add a Theorem Editor that reviews every proposed final theorem before the
  Kernel Referee is allowed to certify it.
- [ ] Reject results that are merely:
  - “The claim holds for $n\le N$.”
  - Restatements of exhaustive computation.
  - Direct substitutions or elementary factorizations.
  - The original conjecture with one exception added.
  - Finite tables without a structural explanation.
- [ ] Require at least one substantive contribution:
  - An infinite family or classification.
  - A necessary and sufficient condition.
  - A new invariant or equivalence.
  - A non-obvious bound.
  - A general recurrence or algorithm.
  - A reduction to another mathematical problem.
  - An improvement over a published bound.

### Stop rewarding finite-range retreat

- [ ] Add this constraint to the Prover contract:

> A bounded theorem is unacceptable unless the bound improves a known result,
> resolves a previously unknown finite case, or supports a broader structural
> theorem. Do not repair a false universal conjecture merely by stopping
> immediately before its smallest counterexample.

- [ ] Archive a rejected finite-range repair as an experimental observation,
  then continue searching for a mechanism or stronger nearby statement.
- [ ] Do not count a finite-range retreat as a successful research cycle.

### Add a Mechanist before the Prover

- [ ] After every counterexample, require the Mechanist to answer:
  - Why does the conjecture fail?
  - Which invariant predicts the failure?
  - Are there infinitely many related failures?
  - What algebraic structure creates them?
  - Can all failures be classified?
  - What nearby statement survives for structural reasons?
- [ ] Send the Mechanist’s explanation to the Prover along with the raw
  counterexample.
- [ ] Require the Prover to incorporate or explicitly rebut the proposed
  mechanism.

### Generate research questions, not just seductive false claims

- [ ] Stop requiring Explorer to begin with a universal conjecture likely to be
  destroyed within the current search budget.
- [ ] Let Explorer first formulate and investigate questions such as:
  - Classify all $n$ satisfying a property.
  - Determine the asymptotic frequency of exceptions.
  - Find the exact obstruction.
  - Characterize when a recurrence has a divisibility property.
  - Relate two apparently different sequences.
  - Improve the best currently known bound.
- [ ] Allow the conjecture to emerge after exploration rather than forcing it
  before the mathematical structure is understood.

### Score theorem depth explicitly

- [ ] Introduce a depth score:

```text
Depth =
  structural generality
  + explanatory power
  + novelty confidence
  + proof complexity
  + connection to open mathematics
  - finite-range penalty
  - exception-list penalty
  - brute-force dependence
```

- [ ] Require a minimum depth score before Kernel Referee certification.
- [ ] Archive low-scoring but valid results as `OBSERVATION`, not `THEOREM`.
- [ ] Record the individual score components and justification so the score is
  auditable rather than an unexplained agent opinion.

### Require comparison with known mathematics

- [ ] Before judging a theorem interesting, require the Literature Referee to
  answer:
  - Is this already known?
  - Is it an elementary corollary of a known result?
  - What is the strongest related published theorem?
  - Does this result improve anything?
  - Which open question does it advance?
- [ ] Reject “novelty by missing citation”: failure to find prior work is not
  sufficient evidence that a result is new.
- [ ] Attach citations and a novelty-confidence assessment to the theorem.

### Give agents longer research horizons

- [ ] Stop forcing every cycle to conclude with a theorem.
- [ ] Permit useful intermediate outcomes:
  - A new lemma.
  - A failed approach with a diagnosed reason.
  - A reusable counterexample dataset.
  - A promising conjecture.
  - A reduction to another problem.
  - A computational bound.
  - A clearly scoped open subproblem.
- [ ] Persist these outcomes so later sessions can build several lemmas into a
  serious theorem.

### Separate discovery from certification

- [ ] Use distinct result levels:
  - `EXPERIMENTAL OBSERVATION`
  - `STRUCTURAL THEOREM`
  - `FORMALLY PROVED RESULT`
- [ ] Treat a Wolfram search or exhaustive finite computation as an experimental
  observation unless it is itself the complete statement being claimed.
- [ ] Require a structural mathematical argument for `STRUCTURAL THEOREM`.
- [ ] Require Lean, Isabelle, or another formal system for `FORMALLY PROVED
  RESULT`.
- [ ] Display the result level prominently in the archive instead of using one
  generic `CERTIFIED` badge.

### Non-negotiable acceptance rule

- [ ] Enforce this rule in prompts, schemas, validation code, and tests:

> The society may not certify “true up to the first counterexample” as its final
> theorem unless that finite boundary is independently significant, previously
> unknown, improves a published result, or is a necessary component of a broader
> structural theorem.

- [ ] Add regression tests in which the Prover attempts a trivial finite repair
  and verify that the Theorem Editor rejects it.
- [ ] Add positive regression tests showing that classifications, infinite
  families, structural equivalences, meaningful new bounds, and reusable lemmas
  can pass the gate.

## Target architecture

Build a persistent mathematical research institute that studies selected open
problems, accumulates reusable theory over weeks, checks the literature, runs
reproducible Wolfram experiments, and formally verifies its strongest results.

The core loop should evolve from:

```text
conjecture → counterexample → repair
```

into:

```text
question → theory → experiments → lemmas → synthesis → external verification
```

No architecture can guarantee a breakthrough. The goal is to create a credible,
auditable process in which useful mathematical progress compounds over time.
