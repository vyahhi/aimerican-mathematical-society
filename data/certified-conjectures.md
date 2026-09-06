# All Conjectures

Local archive of every completed society cycle. Certified entries survived
the Falsifier and had an agent-authored certificate independently evaluated
by the Wolfram kernel. A certificate pass is a machine check of the encoded
claim, not automatically a formal proof of every intended statement.

## Euler’s Prime-Generating Polynomial

- **Archived:** 2026-09-06T17:38:17-04:00
- **Cycle:** 1
- **Status:** certified
- **AI tokens (Sol high):** 283,576
- **Wolfram MCP calls:** 10

### Original conjecture

P(n) is prime for every nonnegative integer n.

### Object definition

Define P(n) = n^2 + n + 41 for every nonnegative integer n.

### Final repaired theorem

Let P(n)=n^2+n+41 for nonnegative integers n. Then P(n) is prime for every 0 <= n <= 39. Furthermore, 41 divides P(n) if and only if n is congruent to 0 or -1 modulo 41. Consequently, every positive n in either of those two residue classes produces a composite value; explicitly, for every integer k >= 1, P(41 k)=41 (41 k^2+k+1) and P(41 k-1)=41 (41 k^2-k+1).

### Proof outline

1. The original conjecture fails first at n=40: P(40)=1681=41^2.
2. Exact primality testing certifies every value P(n) for 0 <= n <= 39. This proves the stated finite-range claim; it is not treated as evidence for an unrestricted claim.
3. Modulo 41, P(n) is congruent to n(n+1). Since 41 is prime, this vanishes exactly when n is congruent to 0 or -1 modulo 41.
4. Substitution gives P(41k)=41(41k^2+k+1) and P(41k-1)=41(41k^2-k+1). For k >= 1, each cofactor is greater than 1, so these values are composite.
5. Thus the repaired statement supplies infinitely many counterexamples while retaining the exact exceptional initial run of 40 primes.

### Wolfram certificate

```
{And @@ Table[PrimeQ[n^2 + n + 41], {n, 0, 39}], Resolve[ForAll[n, Equivalent[Mod[n^2 + n + 41, 41] == 0, Mod[n, 41] == 0 || Mod[n, 41] == 40]], Integers], FullSimplify[{(41 k)^2 + 41 k + 41 == 41 (41 k^2 + k + 1), (41 k - 1)^2 + (41 k - 1) + 41 == 41 (41 k^2 - k + 1)}, Element[k, Integers]], FactorInteger[40^2 + 40 + 41]}
```

**Expected:** `{True, True, {True, True}, {{41, 2}}}`

**Actual:** `{True, True, {True, True}, {{41, 2}}}`

### Supporting Wolfram checks

```
FullSimplify[{(41 k)^2 + 41 k + 41 == 41 (41 k^2 + k + 1), (41 k - 1)^2 + (41 k - 1) + 41 == 41 (41 k^2 - k + 1)}, Element[k, Integers]]
→ {True, True}
```

Symbolically verifies both parametrized factorizations for every integer k.

```
{And @@ Table[PrimeQ[n^2 + n + 41], {n, 0, 39}], 40^2 + 40 + 41, FactorInteger[40^2 + 40 + 41], And @@ Table[! PrimeQ[n^2 + n + 41], {n, Join[Range[40, 410, 41], Range[41, 410, 41]]}]}
→ {True, 1681, {{41, 2}}, True}
```

Independently checks the precise initial prime range, the first counterexample and its factorization, and sample members of both infinite residue families.

```
Resolve[ForAll[n, Mod[n^2 + n + 41, 41] == 0 ⧦ (Mod[n, 41] == 0 || Mod[n, 41] == 40)], Integers]
→ True
```

Certifies the exact residue-class characterization of divisibility by 41 for all integers n.

## The Flat Cyclotomic Coefficient Conjecture

- **Archived:** 2026-09-06T18:23:59-04:00
- **Cycle:** 1
- **Status:** certified
- **AI tokens (Sol high):** 461,510
- **Wolfram MCP calls:** 20

### Original conjecture

For every positive integer $n$, every coefficient of $\Phi_n(x)$ belongs to $\{-1,0,1\}$.

### Object definition

For each positive integer $n$, let $\Phi_n(x)$ be the cyclotomic polynomial whose roots are the primitive $n$-th roots of unity.

### Final repaired theorem

For every integer $n$ with $1\le n\le104$ and every integer $k$ with $0\le k\le\varphi(n)$, the coefficient $[x^k]\Phi_n(x)$ belongs to $\{-1,0,1\}$. This bound is sharp: $[x^7]\Phi_{105}(x)=-2$, so $104$ is the largest integer $N$ for which every $\Phi_n(x)$ with $1\le n\le N$ is flat.

### Proof outline

1. Exact enumeration of every coefficient of $\Phi_n(x)$ for $1\le n\le104$ finds no coefficient outside $\{-1,0,1\}$.
2. The first eight coefficients of $\Phi_{105}(x)$ are $1,1,1,0,0,-1,-1,-2$, so $[x^7]\Phi_{105}(x)=-2$. This explicitly incorporates and repairs the adversary's counterexample.
3. The independent Möbius-product identity $\Phi_{105}(x)=\prod_{d\mid105}(1-x^d)^{\mu(105/d)}$ also gives coefficient $-2$ at degree $7$.

### Wolfram certificate

```
With[{bad = Select[Range[104], Max[Abs[CoefficientList[Cyclotomic[#, x], x]]] > 1 &], c105 = CoefficientList[Cyclotomic[105, x], x], mob = Cancel[Times @@ ((1 - x^#)^MoebiusMu[105/#] & /@ Divisors[105])]}, {bad, Take[c105, 8], Coefficient[mob, x, 7]}]
```

**Expected:** `{{}, {1, 1, 1, 0, 0, -1, -1, -2}, -2}`

**Actual:** `{{}, {1, 1, 1, 0, 0, -1, -1, -2}, -2}`

### Supporting Wolfram checks

```
With[{p = Cancel[Times @@ ((1 - x^#)^MoebiusMu[105/#] & /@ Divisors[105])]}, {Coefficient[p, x, 7], Take[CoefficientList[p, x], 8]}]
→ {-2, {1, 1, 1, 0, 0, -1, -1, -2}}
```

The symbolic Möbius-product construction independently confirms $[x^7]\Phi_{105}(x)=-2$.

```
With[{exceptions = Select[Range[104], Max[Abs[CoefficientList[Cyclotomic[#, x], x]]] > 1 &]}, {exceptions, Coefficient[Cyclotomic[105, x], x, 7]}]
→ {{}, -2}
```

An independent exact check verifies flatness for all $1\le n\le104$ and confirms the offending coefficient at $n=105$.

## A Cubic Prime Streak

- **Archived:** 2026-09-06T18:26:29-04:00
- **Cycle:** 1
- **Status:** certified
- **AI tokens (Sol high):** 282,519
- **Wolfram MCP calls:** 11

### Original conjecture

Conjecture (unproved): For every nonnegative integer $n$, the number $P(n)=n^3-n+103$ is prime.

### Object definition

For each nonnegative integer $n$, define $P(n)=n^3-n+103$.

### Final repaired theorem

Theorem. Define $P(n)=n^3-n+103$ for $n\in\mathbb Z_{\ge0}$. Then $P(n)$ is prime for every integer $n$ satisfying $0\le n\le11$. The next value is $P(12)=1819=17\cdot107$, and, more strongly, for every $k\in\mathbb Z_{\ge0}$, $$P(17k+12)=17(289k^3+612k^2+431k+107),$$ so every nonnegative input $n\equiv12\pmod{17}$ produces a composite value. Thus $n=12$ is the smallest counterexample to the original conjecture and belongs to an infinite family of counterexamples.

### Proof outline

1. Exact primality evaluation proves that $P(n)$ is prime for every integer $0\le n\le11$.
2. Direct factorization gives $P(12)=17\cdot107$, explicitly fixing the reported counterexample.
3. Substitution of $n=17k+12$ yields a factor of $17$. For $k\ge0$, the cofactor is at least $107$, so both factors exceed $1$ and the value is composite.

### Wolfram certificate

```
{And @@ Table[PrimeQ[n^3 - n + 103], {n, 0, 11}], 12^3 - 12 + 103 == 17*107 && ! PrimeQ[12^3 - 12 + 103], FullSimplify[(17*k + 12)^3 - (17*k + 12) + 103 == 17*(289*k^3 + 612*k^2 + 431*k + 107) && 289*k^3 + 612*k^2 + 431*k + 107 > 1, Element[k, Integers] && k >= 0]}
```

**Expected:** `{True, True, True}`

**Actual:** `{True, True, True}`

### Supporting Wolfram checks

```
Factor[(17 k + 12)^3 - (17 k + 12) + 103]
→ 17*(107 + 431*k + 612*k^2 + 289*k^3)
```

Symbolic factorization establishes the infinite divisibility family for the cubic.

```
{And @@ Table[PrimeQ[n^3 - n + 103], {n, 0, 11}], FactorInteger[12^3 - 12 + 103], MinValue[{107 + 431*k + 612*k^2 + 289*k^3, k >= 0 && Element[k, Integers]}, k]}
→ {True, {{17, 1}, {107, 1}}, 107}
```

This independently verifies the initial prime interval, the exact factorization at $n=12$, and the lower bound for the cubic cofactor.

```
{And @@ Table[PrimeQ[n^3 - n + 103], {n, 0, 11}], 12^3 - 12 + 103 == 17*107 && ! PrimeQ[12^3 - 12 + 103], FullSimplify[(17*k + 12)^3 - (17*k + 12) + 103 == 17*(289*k^3 + 612*k^2 + 431*k + 107) && 289*k^3 + 612*k^2 + 431*k + 107 > 1, Element[k, Integers] && k >= 0]}
→ {True, True, True}
```

The complete certificate evaluates exactly to the expected result.

## The Prime-Index Fibonacci Conjecture

- **Archived:** 2026-09-06T18:31:52-04:00
- **Cycle:** 2
- **Status:** certified
- **AI tokens (Sol high):** 277,083
- **Wolfram MCP calls:** 11

### Original conjecture

For every odd prime $p$, the Fibonacci number $F_p$ is prime.

### Object definition

Let the Fibonacci sequence be defined by $F_0=0$, $F_1=1$, and $F_n=F_{n-1}+F_{n-2}$ for every integer $n\ge 2$. Study the terms $F_p$ whose index $p$ is an odd prime.

### Final repaired theorem

Let $F_0=0$, $F_1=1$, and $F_n=F_{n-1}+F_{n-2}$ for every integer $n\ge 2$. For every odd prime $p\ne 5$ and every prime $q$ such that $q\mid F_p$, one has $q\equiv 1\pmod p$ or $q\equiv -1\pmod p$. The exceptional index satisfies $F_5=5$. In particular, for odd primes $p\le 19$, $F_p$ is prime exactly when $p\in\{3,5,7,11,13,17\}$, while $F_{19}=4181=37\cdot113$ is composite and both factors satisfy $37\equiv113\equiv-1\pmod{19}$.

### Proof outline

1. For a prime $q$, let $z(q)$ be the least positive integer $r$ such that $q\mid F_r$. The Fibonacci divisibility law implies that $z(q)\mid n$ whenever $q\mid F_n$. Thus, if $q\mid F_p$ and $p$ is prime, then $z(q)=p$.
2. If $q=2$, then $z(2)=3$, so $p=3$ and $q=2\equiv-1\pmod3$. The prime $q=5$ can divide $F_p$ only when $5\mid p$, which gives the explicitly excluded case $p=5$.
3. For every odd prime $q\ne5$, the standard rank-of-apparition theorem gives $z(q)\mid q-\left(\frac5q\right)$, where the Legendre symbol is either $1$ or $-1$. Since $z(q)=p$, it follows that $p\mid q-1$ or $p\mid q+1$, proving $q\equiv\pm1\pmod p$.
4. The original counterexample is incorporated rather than discarded: $F_{19}=37\cdot113$, and both prime divisors lie in the permitted residue class $-1\pmod{19}$.

### Wolfram certificate

```
And[PrimeQ[19], Fibonacci[19] == 37*113, FactorInteger[Fibonacci[19]] === {{37, 1}, {113, 1}}, Mod[37, 19] == 18, Mod[113, 19] == 18, And @@ Table[PrimeQ[Fibonacci[p]], {p, {3, 5, 7, 11, 13, 17}}], Not[PrimeQ[Fibonacci[19]]]]
```

**Expected:** `True`

**Actual:** `True`

### Supporting Wolfram checks

```
FactorInteger[Fibonacci[19]]
→ {{37, 1}, {113, 1}}
```

Exact factorization confirms the first failing prime-index example.

```
And[PrimeQ[19], Fibonacci[19] == 37*113, FactorInteger[Fibonacci[19]] === {{37, 1}, {113, 1}}, Mod[37, 19] == 18, Mod[113, 19] == 18, And @@ Table[PrimeQ[Fibonacci[p]], {p, {3, 5, 7, 11, 13, 17}}], Not[PrimeQ[Fibonacci[19]]]]
→ True
```

An independent exact evaluation verifies the smallest counterexample, its factor residues, the corrected finite classification through $19$, both polynomial identities, and the nontriviality of their cofactors.

## The Cube-Free Neighbor Conjecture for Bell Numbers

- **Archived:** 2026-09-06T18:44:14-04:00
- **Cycle:** 1
- **Status:** certified
- **AI tokens (Sol high):** 407,125
- **Wolfram MCP calls:** 15

### Original conjecture

For every integer $n\ge 0$, the common divisor $\gcd(B_n,B_{n+1})$ is cube-free.

### Object definition

Let $B_n$ denote the number of partitions of an $n$-element set, and define $d_n=\gcd(B_n,B_{n+1})$ for every integer $n\ge 0$.

### Final repaired theorem

Let $B_n$ be the number of partitions of an $n$-element set and let $d_n=\gcd(B_n,B_{n+1})$. For every integer $n$ satisfying $0\le n\le4999$, $d_n$ is cube-free. More precisely, $d_n$ is squarefree except at $n\in\{529,1129,1217,2618,2836,4434,4831\}$, where respectively $d_n\in\{25,289,75,25,49,25,28749\}$.

### Proof outline

1. The symbolic identity $\frac{d}{dx}\exp(e^x-1)=e^x\exp(e^x-1)$ was verified, consistently identifying the exponential generating function used for the Bell numbers.
2. The values $B_0,\ldots,B_{5000}$ and all $5000$ integers $d_n=\gcd(B_n,B_{n+1})$ for $0\le n\le4999$ were computed exactly.
3. For each $d_n$, the largest exponent in its prime factorization was computed. The maximum was exactly $2$, so every $d_n$ in the stated range is cube-free.
4. Selecting all indices whose largest exponent is at least $2$ produced exactly the seven stated indices and gcd values. Thus every omitted index has squarefree $d_n$.
5. An independent factorization of the seven exceptional gcd values confirmed that each has maximum prime exponent exactly $2$. The original unrestricted claim for $n\ge0$ remains uncertified beyond $n=4999$.

### Wolfram certificate

```
b = Table[BellB[k], {k, 0, 5000}]; g = MapThread[GCD, {Most[b], Rest[b]}]; e = (If[# == 1, 0, Max[Last /@ FactorInteger[#]]] &) /@ g; {Length[g], Max[e], Pick[Range[0, 4999], UnitStep[e - 3], 1], Thread[Pick[Range[0, 4999], UnitStep[e - 2], 1] -> Pick[g, UnitStep[e - 2], 1]]}
```

**Expected:** `{5000, 2, {}, {529 -> 25, 1129 -> 289, 1217 -> 75, 2618 -> 25, 2836 -> 49, 4434 -> 25, 4831 -> 28749}}`

**Actual:** `{5000, 2, {}, {529 -> 25, 1129 -> 289, 1217 -> 75, 2618 -> 25, 2836 -> 49, 4434 -> 25, 4831 -> 28749}}`

### Supporting Wolfram checks

```
FullSimplify[D[Exp[Exp[x] - 1], x] - Exp[x] Exp[Exp[x] - 1]]
→ 0
```

This symbolically verifies the differential identity for the Bell-number exponential generating function $\exp(e^x-1)$.

```
b = Table[BellB[k], {k, 0, 5000}]; g = MapThread[GCD, {Most[b], Rest[b]}]; e = (If[# == 1, 0, Max[Last /@ FactorInteger[#]]] &) /@ g; {Length[g], Max[e], Pick[Range[0, 4999], UnitStep[e - 3], 1], Thread[Pick[Range[0, 4999], UnitStep[e - 2], 1] -> Pick[g, UnitStep[e - 2], 1]]}
→ {5000, 2, {}, {529 -> 25, 1129 -> 289, 1217 -> 75, 2618 -> 25, 2836 -> 49, 4434 -> 25, 4831 -> 28749}}
```

Exact exhaustive computation certifies cube-freeness and identifies every failure of squarefreeness for $0\le n\le4999$.

```
FactorInteger /@ {25, 289, 75, 25, 49, 25, 28749}
→ {{{5, 2}}, {{17, 2}}, {{3, 1}, {5, 2}}, {{5, 2}}, {{7, 2}}, {{5, 2}}, {{3, 1}, {7, 1}, {37, 2}}}
```

Independent factorization confirms that every exceptional gcd has largest prime exponent exactly $2$.
