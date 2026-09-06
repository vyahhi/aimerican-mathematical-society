#!/usr/bin/env python3
"""Read-only Wolfram MCP server for the AImerican Mathematical Society."""

from __future__ import annotations

import json
import os
import subprocess
import sys
from typing import Any


PROTOCOL_VERSION = "2025-06-18"
WOLFRAMSCRIPT = os.environ.get("WOLFRAMSCRIPT", "/usr/local/bin/wolframscript")
WOLFRAM_KERNEL = os.environ.get(
    "WOLFRAM_KERNEL", "/Applications/Wolfram.app/Contents/MacOS/WolframKernel"
)


def evaluate_wolfram(expression: str, timeout_seconds: float = 45) -> str:
    if not expression.strip():
        raise ValueError("expression must not be empty")
    if len(expression) > 20_000:
        raise ValueError("expression is too long")

    program = r'''
expr = Environment["CONJECTURE_FORGE_EXPRESSION"];
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
    env["CONJECTURE_FORGE_EXPRESSION"] = expression
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


def ok(message_id: Any, result: Any) -> dict[str, Any]:
    return {"jsonrpc": "2.0", "id": message_id, "result": result}


def error(message_id: Any, code: int, message: str) -> dict[str, Any]:
    return {"jsonrpc": "2.0", "id": message_id, "error": {"code": code, "message": message}}


def handle(message: dict[str, Any]) -> dict[str, Any] | None:
    message_id = message.get("id")
    method = message.get("method")
    if message_id is None:
        return None
    if method == "initialize":
        return ok(
            message_id,
            {
                "protocolVersion": PROTOCOL_VERSION,
                "capabilities": {"tools": {"listChanged": False}},
                "serverInfo": {"name": "aimerican-mathematical-society-wolfram", "version": "0.1.0"},
            },
        )
    if method == "ping":
        return ok(message_id, {})
    if method == "tools/list":
        return ok(
            message_id,
            {
                "tools": [
                    {
                        "name": "evaluate_wolfram",
                        "description": "Evaluate exact Wolfram Language using the local Wolfram kernel.",
                        "annotations": {
                            "title": "Evaluate exact mathematics",
                            "readOnlyHint": True,
                            "destructiveHint": False,
                            "idempotentHint": True,
                            "openWorldHint": False,
                        },
                        "inputSchema": {
                            "type": "object",
                            "properties": {
                                "expression": {"type": "string"},
                                "timeout_seconds": {
                                    "type": "number",
                                    "minimum": 1,
                                    "maximum": 45,
                                    "default": 45,
                                },
                            },
                            "required": ["expression"],
                            "additionalProperties": False,
                        },
                    }
                ]
            },
        )
    if method == "tools/call":
        params = message.get("params") or {}
        if params.get("name") != "evaluate_wolfram":
            return error(message_id, -32602, "unknown tool")
        arguments = params.get("arguments") or {}
        expression = arguments.get("expression")
        if not isinstance(expression, str):
            return error(message_id, -32602, "expression must be a string")
        try:
            timeout = float(arguments.get("timeout_seconds", 45))
            result = evaluate_wolfram(expression, timeout)
            return ok(message_id, {"content": [{"type": "text", "text": result}], "isError": False})
        except Exception as exc:
            return ok(message_id, {"content": [{"type": "text", "text": str(exc)}], "isError": True})
    return error(message_id, -32601, f"method not found: {method}")


def main() -> None:
    for line in sys.stdin:
        if not line.strip():
            continue
        try:
            reply = handle(json.loads(line))
        except Exception as exc:
            reply = error(None, -32700, f"parse error: {exc}")
        if reply is not None:
            print(json.dumps(reply, separators=(",", ":")), flush=True)


if __name__ == "__main__":
    main()
