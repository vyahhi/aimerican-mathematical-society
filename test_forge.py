#!/usr/bin/env python3

from __future__ import annotations

import io
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import Mock, patch

from app import archive_result, read_archive
from forge import (
    CODEX_AGENT_TIMEOUT_SECONDS,
    WOLFRAM_MCP_CONFIG,
    WOLFRAM_MCP_SERVER,
    WOLFRAM_MCP_TOOL,
    forge_conjecture,
    run_codex_agent,
)
from wolfram_kernel import evaluate_wolfram


class FakeAgents:
    def __init__(self) -> None:
        self.roles = []
        self.prompts = []

    def __call__(self, role, prompt, schema, required_calls, progress):
        self.roles.append(role)
        self.prompts.append((role, prompt))
        if role == "explorer":
            result = {
                "title": "Euler polynomial",
                "object_definition": "f(n)=n^2+n+41",
                "domain": "n >= 0",
                "observations": ["first 40 values prime"],
                "conjecture": "f(n) is prime for every n >= 0",
                "plain_english_summary": "This rule produces primes for a surprisingly long opening run. The conjecture says it will never produce a composite number.",
                "why_it_looks_true": "long initial streak",
                "wolfram_evidence": [],
            }
        elif role == "falsifier":
            if "REPAIRED THEOREM" in prompt:
                result = {
                    "verdict": "survived_bounded_search",
                    "domain_model": "nonnegative integers",
                    "simplicity_ordering": "ascending n",
                    "search_strategy": "exact attack",
                    "search_range": "0..5000",
                    "attack_units_used": 5001,
                    "uncovered_regions": "n > 5000",
                    "smallest_counterexample": "",
                    "counterexample_explanation": "none found",
                    "wolfram_checks": [],
                }
            else:
                self.require(prompt, "f(n) is prime")
                result = {
                "verdict": "falsified",
                "domain_model": "nonnegative integers",
                "simplicity_ordering": "ascending n",
                "search_strategy": "ascending exact search",
                "search_range": "0..5000",
                "attack_units_used": 41,
                "uncovered_regions": "not needed after smallest failure",
                "smallest_counterexample": "n=40, f(n)=1681=41^2",
                "counterexample_explanation": "composite",
                "wolfram_checks": [],
                }
        else:
            self.require(prompt, "1681" if self.roles.count("prover") == 1 else "repair counterexample")
            result = {
                "repaired_conjecture": "f(41k) is divisible by 41",
                "repair_type": "residue class",
                "proof_status": "certified",
                "proof_outline": ["substitute n=41k", "factor 41"],
                "certificate_expression": "FullSimplify[Mod[(41 k)^2 + 41 k + 41, 41] == 0, Element[k, Integers]]",
                "certificate_expected_result": "True",
                "discoveries": ["infinite composite family"],
                "wolfram_checks": [],
            }
        result["ai_tokens"] = 125
        result["token_usage"] = {
            "input_tokens": 100,
            "cached_input_tokens": 40,
            "cache_write_input_tokens": 0,
            "output_tokens": 25,
            "reasoning_output_tokens": 10,
        }
        progress({"type": "ai_usage", "agent": role, "ai_tokens": 125})
        progress({"type": "agent_completed", "agent": role, "ai_tokens": 125})
        return result

    @staticmethod
    def require(text, needle):
        if needle not in text:
            raise AssertionError(f"missing handoff data: {needle}")


class ForgeTest(unittest.TestCase):
    def test_agent_timeout_allows_official_mcp_startup_and_heavy_math(self):
        self.assertEqual(CODEX_AGENT_TIMEOUT_SECONDS, 420)

    def test_kernel_referee_uses_a_fresh_wolframscript_process(self):
        completed = Mock(returncode=0, stdout="4\n", stderr="")
        with patch("wolfram_kernel.subprocess.run", return_value=completed) as run:
            self.assertEqual(evaluate_wolfram("2+2"), "4")
        command = run.call_args.args[0]
        environment = run.call_args.kwargs["env"]
        self.assertEqual(command[0], "/usr/local/bin/wolframscript")
        self.assertEqual(environment["AIMERICAN_CERTIFICATE_EXPRESSION"], "2+2")
        self.assertNotIn("CONJECTURE_FORGE_EXPRESSION", environment)

    def test_codex_usage_is_counted_without_double_counting_breakdowns(self):
        events = []
        commands = []

        class CompletedProcess:
            def __init__(self, stdout):
                self.stdout = io.StringIO(stdout)
                self.returncode = 0

            def wait(self):
                return self.returncode

            def kill(self):
                self.returncode = -9

        def completed_run(command, **kwargs):
            del kwargs
            commands.append(command)
            output_path = Path(command[command.index("--output-last-message") + 1])
            output_path.write_text(
                '{"title":"Test","object_definition":"x","domain":"x",'
                '"observations":[],"conjecture":"x is x",'
                '"plain_english_summary":"A readable result.",'
                '"why_it_looks_true":"x","wolfram_evidence":[]}',
                encoding="utf-8",
            )
            return CompletedProcess(
                (
                    '{"type":"item.completed","item":{"type":"reasoning",'
                    '"text":"Checking the pattern."}}\n'
                    '{"type":"item.completed","item":{"type":"mcp_tool_call",'
                    '"server":"WolframLanguage","tool":"WolframLanguageEvaluator",'
                    '"status":"completed","arguments":{"code":"2+2"},'
                    '"result":{"content":[{"type":"text","text":"Out[1]= 4"},'
                    '{"type":"text","text":"<system-reminder>session metadata</system-reminder>"}],'
                    '"structured_content":null}}}\n'
                    '{"type":"turn.completed","usage":'
                    '{"input_tokens":1000,"cached_input_tokens":800,'
                    '"cache_write_input_tokens":300,"output_tokens":200,'
                    '"reasoning_output_tokens":75}}\n'
                )
            )

        with patch("forge.subprocess.Popen", side_effect=completed_run):
            report = run_codex_agent(
                "explorer", "test", "explorer.json", 1, events.append
            )

        self.assertEqual(report["ai_tokens"], 1200)
        self.assertIn("gpt-5.6-sol", commands[0])
        self.assertIn('model_reasoning_effort="high"', commands[0])
        for override in WOLFRAM_MCP_CONFIG:
            self.assertIn(override, commands[0])
        self.assertIn(
            'mcp_servers.WolframLanguage.enabled_tools=["WolframLanguageEvaluator"]',
            commands[0],
        )
        self.assertNotIn("local_mathematica", commands[0])
        self.assertEqual(
            report["token_usage"],
            {
                "input_tokens": 1000,
                "cached_input_tokens": 800,
                "cache_write_input_tokens": 300,
                "output_tokens": 200,
                "reasoning_output_tokens": 75,
            },
        )
        usage_event = next(event for event in events if event["type"] == "ai_usage")
        self.assertEqual(usage_event["ai_tokens"], 1200)
        prompt_event = next(event for event in events if event["type"] == "agent_prompt")
        self.assertEqual(prompt_event["prompt"], "test")
        self.assertEqual(prompt_event["model"], "gpt-5.6-sol")
        wolfram_event = next(event for event in events if event["type"] == "wolfram_call")
        self.assertEqual(wolfram_event["expression"], "2+2")
        self.assertEqual(wolfram_event["result"], "Out[1]= 4")
        outputs = [event for event in events if event["type"] == "codex_output"]
        self.assertEqual(outputs[0]["message"], "Checking the pattern.")
        self.assertTrue(any(event["kind"] == "structured" for event in outputs))
        self.assertIn("A readable result", outputs[-1]["message"])

    def test_falsify_repair_and_independent_certificate(self):
        fake = FakeAgents()
        events = []
        report = forge_conjecture(
            "Explore n^2+n+41",
            progress=events.append,
            agent_runner=fake,
            kernel=lambda expression: "True",
        )
        self.assertEqual(fake.roles, ["explorer", "falsifier", "prover", "falsifier"])
        self.assertEqual(report["falsifier"]["verdict"], "falsified")
        self.assertEqual(report["validation_falsifier"]["verdict"], "survived_bounded_search")
        self.assertTrue(report["certificate"]["passed"])
        self.assertEqual(report["termination"], "certified")
        self.assertEqual(report["metrics"], {"ai_tokens": 500, "wolfram_calls": 1})
        explorer_report = next(event for event in events if event["type"] == "agent_report")
        self.assertIn("never produce a composite", explorer_report["summary"])
        self.assertEqual(explorer_report["object_definition"], "f(n)=n^2+n+41")
        self.assertEqual(events[-1]["type"], "round_completed")

    def test_empty_seed_starts_autonomous_discovery(self):
        fake = FakeAgents()
        report = forge_conjecture(" ", agent_runner=fake, kernel=lambda x: "True")
        self.assertEqual(fake.roles, ["explorer", "falsifier", "prover", "falsifier"])
        self.assertTrue(report["seed"]["autonomous"])
        self.assertEqual(report["seed"]["topic"], "Euler polynomial")

    def test_all_agent_prompts_require_only_the_official_evaluator(self):
        fake = FakeAgents()
        forge_conjecture("Explore n^2+n+41", agent_runner=fake, kernel=lambda x: "True")
        self.assertEqual(WOLFRAM_MCP_SERVER, "WolframLanguage")
        self.assertEqual(WOLFRAM_MCP_TOOL, "WolframLanguageEvaluator")
        for _, prompt in fake.prompts:
            self.assertIn(
                "WolframLanguage.WolframLanguageEvaluator", prompt
            )
            self.assertIn("Do not use shell commands", prompt)
            self.assertNotIn("local_mathematica", prompt)

    def test_prover_is_told_to_stay_within_the_explorers_object(self):
        fake = FakeAgents()
        forge_conjecture("Explore n^2+n+41", agent_runner=fake, kernel=lambda x: "True")
        prover_prompt = next(prompt for role, prompt in fake.prompts if role == "prover")
        self.assertIn("Stay strictly within the\nmathematical object", prover_prompt)
        self.assertIn("The current object is $n^2+n+41$", prover_prompt)

    def test_unrelated_euler_hint_is_absent_for_other_objects(self):
        fake = FakeAgents()

        def cubic_agents(role, prompt, schema, required_calls, progress):
            result = fake(role, prompt, schema, required_calls, progress)
            if role == "explorer":
                result["object_definition"] = "P(n)=n^3-n+103"
            return result

        forge_conjecture("Explore a cubic", agent_runner=cubic_agents, kernel=lambda x: "True")
        prover_prompt = next(prompt for role, prompt in fake.prompts if role == "prover")
        self.assertNotIn("n^2+n+41", prover_prompt)

    def test_stops_after_max_rounds_when_repairs_keep_breaking(self):
        fake = FakeAgents()

        def always_break(role, prompt, schema, required_calls, progress):
            result = fake(role, prompt, schema, required_calls, progress)
            if role == "falsifier" and "REPAIRED THEOREM" in prompt:
                result["verdict"] = "falsified"
                result["smallest_counterexample"] = "repair counterexample"
            return result

        report = forge_conjecture(
            "Explore n^2+n+41",
            agent_runner=always_break,
            kernel=lambda expression: self.fail("certificate must not run"),
            max_rounds=3,
        )
        self.assertEqual(report["termination"], "max_rounds")
        self.assertEqual(len(report["rounds"]), 3)
        self.assertFalse(report["certificate"]["passed"])
        self.assertEqual(fake.roles.count("prover"), 3)

    def test_completed_results_are_saved_as_json_and_markdown(self):
        report = forge_conjecture(
            "Explore n^2+n+41",
            agent_runner=FakeAgents(),
            kernel=lambda expression: "True",
        )
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            json_path = root / "archive.json"
            markdown_path = root / "archive.md"
            record = archive_result(
                report, 2, "job-123", json_path, markdown_path
            )
            saved = read_archive(json_path)
            self.assertEqual(saved[0]["id"], record["id"])
            self.assertEqual(saved[0]["cycle"], 2)
            self.assertEqual(saved[0]["status"], "certified")
            self.assertEqual(saved[0]["object_definition"], "f(n)=n^2+n+41")
            self.assertIn("Final repaired theorem", markdown_path.read_text())
            self.assertIn("Object definition", markdown_path.read_text())
            self.assertIn("f(41k) is divisible by 41", markdown_path.read_text())
            self.assertEqual(len(json.loads(json_path.read_text())), 1)

    def test_uncertified_results_are_also_archived(self):
        report = forge_conjecture(
            "Explore n^2+n+41",
            agent_runner=FakeAgents(),
            kernel=lambda expression: "True",
        )
        report["certificate"]["passed"] = False
        report["termination"] = "max_rounds"
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            record = archive_result(
                report, 3, "job-uncertified", root / "archive.json", root / "archive.md"
            )
            self.assertEqual(record["status"], "not certified")
            self.assertEqual(record["termination"], "max_rounds")


if __name__ == "__main__":
    unittest.main(verbosity=2)
