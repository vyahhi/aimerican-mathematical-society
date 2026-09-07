<p align="center">
  <img src="static/hero-mit-harvard-v2.png" alt="Pixel-art view of the AImerican Mathematical Society in Cambridge, with MIT and Harvard in the background" width="100%">
</p>

# AImerican Mathematical Society

[View the project on Sundai Club](https://www.sundai.club/projects/3d939e29-6781-45d7-8e67-6f0172b9473c)

AImerican Mathematical Society is a local, continuously running society of AI
mathematicians. Codex agents hallucinate conjectures, use the official Wolfram
Local MCP to explore and attack them, repair false statements, and ask an
independent fresh Wolfram kernel process to check the final certificate.

The browser UI shows the Explorer, Falsifier, Prover, and Kernel Referee in
real time, including Codex prompts and outputs, AI-token usage, Wolfram MCP calls,
counterexamples, repairs, and certificates.

## How it works

1. **Explorer** chooses a mathematical direction and proposes a conjecture.
2. **Falsifier** searches for the smallest counterexample under a declared
   domain-specific ordering.
3. **Prover** repairs the theorem using the counterexample and exact checks.
4. **Falsifier** attacks the repaired theorem again.
5. **Kernel Referee** independently evaluates its certificate.
6. After certification or the maximum repair rounds, a new cycle begins.

The Prover/Falsifier repair loop is bounded by `max_rounds` (3 by default), so
it cannot run indefinitely on one conjecture. Every completed cycle is archived,
including attempts that reach the limit without a passed certificate, and then
Explorer begins a new conjecture.

Codex agents use JSON Schema-constrained output. The default agent model is
`gpt-5.6-sol` with `high` reasoning. The harness counts exact
`input_tokens + output_tokens` reported by Codex and separately counts successful
Wolfram MCP calls. Explorer, Falsifier, and Prover receive only the official
`WolframLanguageEvaluator` from the `WolframLanguage` MCP server. The Kernel
Referee does not share that MCP session: Python launches a fresh `wolframscript`
process for the final check.

## Prerequisites

- **macOS**. The included defaults target the standard Codex and Wolfram macOS
  application locations.
- **Python 3.9 or newer**. The project uses only the Python standard library;
  there is no `pip install` step.
- **Codex desktop app and CLI**, installed and signed in. By default the harness
  expects `/Applications/Codex.app/Contents/Resources/codex`.
- **An installed and activated Wolfram product with the official AgentTools
  local MCP support**, plus `wolframscript`. Launch the Wolfram product once and
  complete licensing before running the project. The defaults target
  `/Applications/Wolfram.app/Contents/MacOS/wolfram`,
  `/Applications/Wolfram.app/Contents/MacOS/WolframKernel`, and
  `/usr/local/bin/wolframscript`.

No OpenAI API key or separate web framework is required. Authentication is
provided by the signed-in Codex installation.

KaTeX 0.16.22 is vendored under `static/vendor/katex`, so mathematical output
renders locally without a CDN or a separate frontend installation.

## 1. Verify the prerequisites

```bash
python3 --version
/Applications/Codex.app/Contents/Resources/codex --version
/Applications/Wolfram.app/Contents/MacOS/wolfram -version
/usr/local/bin/wolframscript \
  -l /Applications/Wolfram.app/Contents/MacOS/WolframKernel \
  -code '2 + 2'
```

If your executables live elsewhere, use the environment variables documented
under **Configuration**.

## 2. Official Wolfram MCP setup

No global Codex MCP registration is needed. For every Explorer, Falsifier, and
Prover invocation, `forge.py` injects the official Wolfram server configuration
over stdio and restricts it with:

```toml
[mcp_servers.WolframLanguage]
command = "/Applications/Wolfram.app/Contents/MacOS/wolfram"
args = ["-run", "PacletSymbol[\"Wolfram/AgentTools\",\"Wolfram`AgentTools`StartMCPServer\"][]", "-noinit", "-noprompt"]
enabled_tools = ["WolframLanguageEvaluator"]
required = true

[mcp_servers.WolframLanguage.env]
MCP_SERVER_NAME = "WolframLanguage"
```

The configuration is supplied as per-process Codex overrides, so it does not
write to `~/.codex/config.toml`. The prompts also forbid filesystem, process,
environment, network, and notebook operations. This reduces the exposed tool
surface but is not a sandbox: `WolframLanguageEvaluator` can execute Wolfram
Language code, so run this project only in a trusted local environment.

See Wolfram's [official Wolfram MCP Local documentation](https://www.wolfram.com/artificial-intelligence/mcp/local/wolfram-mcp-local/)
and OpenAI's [official MCP documentation](https://learn.chatgpt.com/docs/extend/mcp).

## 3. Run the web app

```bash
cd /Users/vyahhi/projects/sundai/aimerican-mathematical-society
python3 app.py
```

Open [http://127.0.0.1:8765](http://127.0.0.1:8765), then press **LAUNCH**.
The society continues inventing new conjectures until **STOP** is pressed. Stop
waits for the currently active agent to finish.

Past conjectures are available at
[http://127.0.0.1:8765/archive.html](http://127.0.0.1:8765/archive.html). The
server stores structured records in `data/certified-conjectures.json` and a
readable theorem notebook in `data/certified-conjectures.md`. Both files persist
across server restarts. The archive page polls the server's in-memory history
every three seconds, so an open page updates automatically after each cycle.

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
| `CONJECTURE_CODEX_TIMEOUT_SECONDS` | `420` | Maximum wall time for one Codex role, including official MCP startup and calls |
| `WOLFRAM_MCP_COMMAND` | `/Applications/Wolfram.app/Contents/MacOS/wolfram` | Official Wolfram MCP launcher used by Codex agents |
| `WOLFRAMSCRIPT` | `/usr/local/bin/wolframscript` | Wolfram command-line launcher |
| `WOLFRAM_KERNEL` | `/Applications/Wolfram.app/Contents/MacOS/WolframKernel` | Fresh Kernel Referee process |

Example:

```bash
CODEX_BIN=/custom/path/codex \
WOLFRAM_MCP_COMMAND=/custom/path/wolfram \
WOLFRAMSCRIPT=/custom/path/wolframscript \
WOLFRAM_KERNEL=/custom/path/WolframKernel \
python3 app.py
```

The official MCP path is read for every agent invocation, so there is no global
registration to update.

## Project layout

```text
app.py                 Local HTTP server and continuous-job manager
forge.py               Codex multi-agent harness and repair loop
wolfram_kernel.py      Independent fresh-process Kernel Referee evaluator
schemas/               Structured-output schemas for each agent
static/                Browser UI, styles, favicon, and hero artwork
test_forge.py           Unit tests
demo-result.json        Example completed research report
TODO.md                 Roadmap toward cumulative mathematical research
```

## Troubleshooting

### `Failed to fetch`

The local Python server is not running or restarted during a session. Start
`python3 app.py`, reload the page, and press **LAUNCH** again.

### `Codex ... failed`

Verify that Codex is installed, signed in, and available at `CODEX_BIN`. Also
verify that `WOLFRAM_MCP_COMMAND` launches your installed Wolfram product.

### Missing or failed Wolfram calls

First launch the Wolfram desktop product and confirm that its license is active.
For Wolfram Engine, activation can also be started interactively with:

```bash
/usr/local/bin/wolframscript -activate
```

Then check `WOLFRAMSCRIPT` and `WOLFRAM_KERNEL` and test the independent Kernel
Referee path:

```bash
cd /Users/vyahhi/projects/sundai/aimerican-mathematical-society
python3 -c 'from wolfram_kernel import evaluate_wolfram; print(evaluate_wolfram("FactorInteger[1681]"))'
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

The app binds only to `127.0.0.1`. The official Wolfram evaluator executes
Wolfram Language expressions produced by the agents, so run it only in a
trusted local environment.

The Codex harness follows OpenAI's non-interactive structured-output workflow.
Agent computation uses the official Wolfram Local MCP; certificate evaluation
uses a separate fresh `wolframscript` process.
