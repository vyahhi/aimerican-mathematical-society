# AImerican Mathematical Society

AImerican Mathematical Society is a local, continuously running society of AI
mathematicians. Codex agents hallucinate conjectures, use exact Wolfram Language
computations to explore and attack them, repair false statements, and ask an
independent local Wolfram Engine to check the final certificate.

The browser UI shows the Explorer, Falsifier, Proofsmith, and Kernel Referee in
real time, including Codex prompts and outputs, AI-token usage, Wolfram MCP calls,
counterexamples, repairs, and certificates.

## How it works

1. **Explorer** chooses a mathematical direction and proposes a conjecture.
2. **Falsifier** searches for the smallest counterexample under a declared
   domain-specific ordering.
3. **Proofsmith** repairs the theorem using the counterexample and exact checks.
4. **Falsifier** attacks the repaired theorem again.
5. **Kernel Referee** independently evaluates its certificate.
6. After certification or the maximum repair rounds, a new cycle begins.

Codex agents use JSON Schema-constrained output. The default agent model is
`gpt-5.6-sol` with `high` reasoning. The harness counts exact
`input_tokens + output_tokens` reported by Codex and separately counts successful
Wolfram MCP calls.

## Prerequisites

- **macOS**. The included defaults target the standard Codex and Wolfram macOS
  application locations.
- **Python 3.9 or newer**. The project uses only the Python standard library;
  there is no `pip install` step.
- **Codex desktop app and CLI**, installed and signed in. By default the harness
  expects `/Applications/Codex.app/Contents/Resources/codex`.
- **An installed and activated local Wolfram Engine**, supplied by Wolfram,
  Wolfram|One, or Mathematica, plus `wolframscript`. Launch the Wolfram product
  once and complete licensing before running the project. The default paths are
  `/usr/local/bin/wolframscript` and
  `/Applications/Wolfram.app/Contents/MacOS/WolframKernel`.
- **The local MCP registration** shown below. The project supplies its own stdio
  MCP wrapper in `server.py`; agents call its `evaluate_wolfram` tool.

No OpenAI API key or separate web framework is required. Authentication is
provided by the signed-in Codex installation.

## 1. Verify the prerequisites

```bash
python3 --version
/Applications/Codex.app/Contents/Resources/codex --version
/usr/local/bin/wolframscript \
  -l /Applications/Wolfram.app/Contents/MacOS/WolframKernel \
  -code '2 + 2'
```

If your executables live elsewhere, use the environment variables documented
under **Configuration**.

## 2. Register the local Wolfram MCP server

Run this once, using the actual absolute path to your checkout:

```bash
/Applications/Codex.app/Contents/Resources/codex mcp add local_mathematica \
  --env WOLFRAMSCRIPT=/usr/local/bin/wolframscript \
  --env WOLFRAM_KERNEL=/Applications/Wolfram.app/Contents/MacOS/WolframKernel \
  -- /usr/bin/python3 \
  /Users/vyahhi/projects/sundai/aimerican-mathematical-society/server.py
```

Verify the registration:

```bash
/Applications/Codex.app/Contents/Resources/codex mcp get local_mathematica
```

The expected transport is `stdio`, and its configured argument should end in
`aimerican-mathematical-society/server.py`.

## 3. Run the web app

```bash
cd /Users/vyahhi/projects/sundai/aimerican-mathematical-society
python3 app.py
```

Open [http://127.0.0.1:8765](http://127.0.0.1:8765), then press **LAUNCH**.
The society continues inventing new conjectures until **STOP** is pressed. Stop
waits for the currently active agent to finish.

## Run from the CLI

Autonomous research:

```bash
cd /Users/vyahhi/projects/sundai/aimerican-mathematical-society
python3 forge.py "" --budget 5000 --max-rounds 3 --output result.json
```

Seeded research:

```bash
python3 forge.py \
  "Explore the prime-generating polynomial n^2 + n + 41" \
  --budget 5000 \
  --max-rounds 3 \
  --output result.json
```

`--budget` is an attack-resource ceiling, not necessarily a maximum integer.
The Falsifier adapts it to the conjecture's domain.

## Test

```bash
cd /Users/vyahhi/projects/sundai/aimerican-mathematical-society
PYTHONPYCACHEPREFIX=/tmp/aimerican-math-pycache \
  python3 -m unittest discover -s . -p 'test_*.py' -v
```

The unit tests mock Codex and Wolfram, so they are fast and do not spend AI
tokens. For a live integration check, run the web app and launch one session.

## Configuration

| Environment variable | Default | Purpose |
| --- | --- | --- |
| `CODEX_BIN` | `/Applications/Codex.app/Contents/Resources/codex` | Codex CLI executable |
| `CONJECTURE_CODEX_MODEL` | `gpt-5.6-sol` | Agent model |
| `CONJECTURE_CODEX_REASONING` | `high` | Codex reasoning effort |
| `WOLFRAMSCRIPT` | `/usr/local/bin/wolframscript` | Wolfram command-line launcher |
| `WOLFRAM_KERNEL` | `/Applications/Wolfram.app/Contents/MacOS/WolframKernel` | Local Wolfram Engine kernel |

Example:

```bash
CODEX_BIN=/custom/path/codex \
WOLFRAMSCRIPT=/custom/path/wolframscript \
WOLFRAM_KERNEL=/custom/path/WolframKernel \
python3 app.py
```

If the Wolfram paths change after MCP registration, remove and re-add the MCP
entry so the server receives the new environment values:

```bash
/Applications/Codex.app/Contents/Resources/codex mcp remove local_mathematica
```

Then repeat the registration command above.

## Project layout

```text
app.py                 Local HTTP server and continuous-job manager
forge.py               Codex multi-agent harness and repair loop
server.py              Local Wolfram MCP stdio server
schemas/               Structured-output schemas for each agent
static/                Browser UI, styles, favicon, and hero artwork
test_forge.py           Unit tests
demo-result.json        Example completed research report
```

## Troubleshooting

### `Failed to fetch`

The local Python server is not running or restarted during a session. Start
`python3 app.py`, reload the page, and press **LAUNCH** again.

### `Codex ... failed`

Verify that Codex is installed, signed in, and available at `CODEX_BIN`. Then
run `codex mcp get local_mathematica` and confirm the MCP server path is current.

### Missing or failed Wolfram calls

First launch the Wolfram desktop product and confirm that its license is active.
For Wolfram Engine, activation can also be started interactively with:

```bash
/usr/local/bin/wolframscript -activate
```

Then check `WOLFRAMSCRIPT` and `WOLFRAM_KERNEL` and test through the same wrapper
used by the MCP server:

```bash
cd /Users/vyahhi/projects/sundai/aimerican-mathematical-society
python3 -c 'from server import evaluate_wolfram; print(evaluate_wolfram("FactorInteger[1681]"))'
```

Expected output:

```text
{{41, 2}}
```

If startup hangs or times out, the local engine is not ready yet. Complete any
activation or sign-in prompt in Wolfram, close stale `wolframscript` processes,
and retry. You can persist the kernel path for command-line use with:

```bash
/usr/local/bin/wolframscript -configure \
  WOLFRAMSCRIPT_KERNELPATH=/Applications/Wolfram.app/Contents/MacOS/WolframKernel
```

### Port 8765 is already in use

Find the existing local process:

```bash
lsof -nP -iTCP:8765 -sTCP:LISTEN
```

Stop that process before starting another copy of the app.

## Local-use note

The app binds only to `127.0.0.1`. Its Wolfram server evaluates Wolfram Language
expressions produced by the agents, so run it only in a trusted local environment.

The Codex harness follows OpenAI's non-interactive structured-output workflow.
The computation layer uses a local Wolfram Engine through an MCP stdio server.
