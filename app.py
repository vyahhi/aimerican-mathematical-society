#!/usr/bin/env python3
"""Local web server for the AImerican Mathematical Society."""

from __future__ import annotations

import json
import threading
import uuid
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any

from forge import forge_conjecture, run_codex_agent


ROOT = Path(__file__).resolve().parent
STATIC = ROOT / "static"
JOBS: dict[str, dict[str, Any]] = {}
JOBS_LOCK = threading.Lock()


def update_job(job_id: str, **changes: Any) -> None:
    with JOBS_LOCK:
        JOBS[job_id].update(changes)


class JobStopped(Exception):
    pass


def run_job(job_id: str, topic: str, limit: int, max_rounds: int) -> None:
    cycle = 1

    def stop_requested() -> bool:
        with JOBS_LOCK:
            return bool(JOBS[job_id].get("stop_requested"))

    def progress(event: dict[str, Any]) -> None:
        event = {**event, "cycle": cycle}
        with JOBS_LOCK:
            job = JOBS[job_id]
            event["id"] = job["next_event_id"]
            job["next_event_id"] += 1
            job["events"].append(event)
            job["events"] = job["events"][-400:]

    def stoppable_agent(*args: Any, **kwargs: Any) -> dict[str, Any]:
        if stop_requested():
            raise JobStopped()
        return run_codex_agent(*args, **kwargs)

    try:
        while True:
            progress({"type": "cycle_started", "agent": "explorer"})
            result = forge_conjecture(
                topic if cycle == 1 else "",
                limit,
                progress,
                agent_runner=stoppable_agent,
                max_rounds=max_rounds,
                avoid_topics=[item["topic"] for item in JOBS[job_id]["history"]],
            )
            with JOBS_LOCK:
                job = JOBS[job_id]
                job["result"] = result
                job["history"].append(
                    {
                        "cycle": cycle,
                        "topic": result["seed"]["topic"],
                        "termination": result["termination"],
                        "certified": result["certificate"]["passed"],
                        "rounds": len(result["rounds"]),
                    }
                )
                job["history"] = job["history"][-50:]
                job["cycles_completed"] = cycle
            progress(
                {
                    "type": "cycle_completed",
                    "agent": "kernel_referee",
                    "termination": result["termination"],
                }
            )
            if stop_requested():
                update_job(job_id, status="completed", stopped=True)
                return
            cycle += 1
    except JobStopped:
        update_job(job_id, status="completed", stopped=True)
    except Exception as exc:
        update_job(job_id, status="failed", error=str(exc))


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args: Any, **kwargs: Any) -> None:
        super().__init__(*args, directory=str(STATIC), **kwargs)

    def send_json(self, payload: Any, status: HTTPStatus = HTTPStatus.OK) -> None:
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def end_headers(self) -> None:
        self.send_header("Cache-Control", "no-store, max-age=0")
        self.send_header("Access-Control-Allow-Origin", "null")
        super().end_headers()

    def do_OPTIONS(self) -> None:
        self.send_response(HTTPStatus.NO_CONTENT)
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_POST(self) -> None:
        if self.path.startswith("/api/jobs/") and self.path.endswith("/stop"):
            job_id = self.path.split("/")[-2]
            with JOBS_LOCK:
                job = JOBS.get(job_id)
                if job:
                    job["stop_requested"] = True
            if not job:
                self.send_json({"error": "job not found"}, HTTPStatus.NOT_FOUND)
            else:
                self.send_json({"status": "stopping"}, HTTPStatus.ACCEPTED)
            return
        if self.path != "/api/forge":
            self.send_json({"error": "not found"}, HTTPStatus.NOT_FOUND)
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if length > 20_000:
                raise ValueError("request too large")
            payload = json.loads(self.rfile.read(length) or b"{}")
            topic = str(payload.get("topic", "")).strip()
            limit = int(payload.get("attack_budget", payload.get("search_limit", 5000)))
            max_rounds = int(payload.get("max_rounds", 3))
            if len(topic) > 500:
                raise ValueError("topic must contain at most 500 characters")
            if not 50 <= limit <= 1_000_000:
                raise ValueError("attack budget must be between 50 and 1,000,000")
            if not 1 <= max_rounds <= 10:
                raise ValueError("max rounds must be between 1 and 10")
            job_id = uuid.uuid4().hex
            with JOBS_LOCK:
                if len(JOBS) >= 25:
                    oldest = next(iter(JOBS))
                    JOBS.pop(oldest)
                JOBS[job_id] = {
                    "status": "running",
                    "events": [],
                    "next_event_id": 1,
                    "result": None,
                    "history": [],
                    "cycles_completed": 0,
                    "stop_requested": False,
                    "stopped": False,
                }
            threading.Thread(
                target=run_job,
                args=(job_id, topic, limit, max_rounds),
                daemon=True,
            ).start()
            self.send_json({"job_id": job_id}, HTTPStatus.ACCEPTED)
        except (ValueError, TypeError, json.JSONDecodeError) as exc:
            self.send_json({"error": str(exc)}, HTTPStatus.BAD_REQUEST)

    def do_GET(self) -> None:
        if self.path == "/api/demo":
            demo = ROOT / "demo-result.json"
            if not demo.exists():
                self.send_json({"error": "demo not generated yet"}, HTTPStatus.NOT_FOUND)
            else:
                self.send_json(json.loads(demo.read_text(encoding="utf-8")))
            return
        if self.path.startswith("/api/jobs/"):
            job_id = self.path.rsplit("/", 1)[-1]
            with JOBS_LOCK:
                job = JOBS.get(job_id)
                snapshot = json.loads(json.dumps(job)) if job else None
            if snapshot is None:
                self.send_json({"error": "job not found"}, HTTPStatus.NOT_FOUND)
            else:
                self.send_json(snapshot)
            return
        super().do_GET()

    def log_message(self, fmt: str, *args: Any) -> None:
        print(f"[aimerican-mathematical-society] {fmt % args}")


def main() -> None:
    server = ThreadingHTTPServer(("127.0.0.1", 8765), Handler)
    print("AImerican Mathematical Society: http://127.0.0.1:8765", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
