#!/usr/bin/env python3
"""Independent fresh-process Wolfram evaluator for the Kernel Referee."""

from __future__ import annotations

import os
import subprocess


WOLFRAMSCRIPT = os.environ.get("WOLFRAMSCRIPT", "/usr/local/bin/wolframscript")
WOLFRAM_KERNEL = os.environ.get(
    "WOLFRAM_KERNEL", "/Applications/Wolfram.app/Contents/MacOS/WolframKernel"
)


def evaluate_wolfram(expression: str, timeout_seconds: float = 45) -> str:
    """Evaluate one certificate in a new wolframscript/kernel process."""
    if not expression.strip():
        raise ValueError("expression must not be empty")
    if len(expression) > 20_000:
        raise ValueError("expression is too long")

    program = r'''
expr = Environment["AIMERICAN_CERTIFICATE_EXPRESSION"];
result = Quiet[Check[TimeConstrained[ToExpression[expr], 40, $TimedOut], $Failed]];
Which[
  result === $TimedOut, WriteString[$Output, "ERROR: Wolfram evaluation timed out"],
  result === $Failed, WriteString[$Output, "ERROR: Wolfram evaluation failed"],
  True, WriteString[$Output, ToString[result, InputForm]]
];
Exit[];
'''.strip()
    env = os.environ.copy()
    env["WolframKernel"] = WOLFRAM_KERNEL
    env["AIMERICAN_CERTIFICATE_EXPRESSION"] = expression
    completed = subprocess.run(
        [WOLFRAMSCRIPT, "-code", program],
        check=False,
        capture_output=True,
        text=True,
        timeout=timeout_seconds,
        env=env,
    )
    output = completed.stdout.strip()
    if completed.returncode != 0:
        raise RuntimeError(completed.stderr.strip() or output or "wolframscript failed")
    if output.startswith("ERROR:"):
        raise RuntimeError(output)
    return output
