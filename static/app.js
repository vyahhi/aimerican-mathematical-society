const $ = id => document.getElementById(id);
const API_ROOT = location.protocol === "file:" ? "http://127.0.0.1:8765" : "";
let poller = null;
let clock = null;
let startedAt = 0;
let seenEvents = 0;
let networkFailures = 0;
let currentJobId = null;
let renderedCycles = 0;
const ATTACK_BUDGET = 5000;
const MAX_REPAIR_ROUNDS = 3;
let usageStats = {tokens:0,wolfram:0,agents:{}};

$("again").addEventListener("click", () => { $("result").classList.add("hidden"); $("forge-form").scrollIntoView({behavior:"smooth"}); });
$("stop").addEventListener("click", async () => {
  if(!currentJobId) return;
  $("stop").disabled=true; $("stop").textContent="STOPPING"; addLog("Stopping after the active agent finishes…",true);
  try {
    const response=await fetch(`${API_ROOT}/api/jobs/${currentJobId}/stop`,{method:"POST"});
    if(!response.ok) throw new Error("Could not stop society");
  } catch(error) { fail(error); }
});

function addLog(message, hot=false) {
  const row = document.createElement("p");
  const stamp = document.createElement("time");
  stamp.textContent = new Date().toLocaleTimeString([], {hour12:false});
  row.append(stamp, document.createTextNode(message));
  if (hot) row.className = "hot";
  $("log").append(row); $("log").scrollTop = $("log").scrollHeight;
}

function logValue(value) {
  if(value==null) return "";
  if(typeof value==="string") return value;
  try { return JSON.stringify(value,null,2); } catch { return String(value); }
}

function card(agent) { return document.querySelector(`[data-agent="${agent}"]`); }
function agentStats(agent) {
  return usageStats.agents[agent]||(usageStats.agents[agent]={tokens:0,wolfram:0});
}
function showUsageStats(agent) {
  $("usage-totals").textContent=`${usageStats.tokens.toLocaleString()} AI tokens (Sol high) · ${usageStats.wolfram} Wolfram MCP calls`;
  if(!agent) return;
  const stats=agentStats(agent); const node=card(agent);
  node?.querySelector("small").replaceChildren(`${stats.tokens.toLocaleString()} AI tokens (Sol high) · ${stats.wolfram} Wolfram MCP calls`);
}
function resetCards() {
  usageStats={tokens:0,wolfram:0,agents:{}}; showUsageStats();
  document.querySelectorAll(".agent-cards article").forEach(node=>{
    node.className=""; node.querySelector("em").textContent="waiting";
    node.querySelector("small").textContent="0 AI tokens (Sol high) · 0 Wolfram MCP calls";
  });
}
function handleEvent(event) {
  const node = card(event.agent);
  if (event.type === "cycle_started") {
    $("cycle-label").textContent=`Cycle ${event.cycle}`;
    resetCards();
    addLog(`Cycle ${event.cycle}: Explorer hallucinating a conjecture.`,true);
  } else if (event.type === "round_started") {
    $("cycle-label").textContent=`Cycle ${event.cycle} · Round ${event.round}/${event.max_rounds}`;
    addLog(`Repair round ${event.round}/${event.max_rounds}.`,true);
  } else if (event.type === "round_completed") {
    addLog(`Round ${event.round}: ${event.certified ? "certified" : event.survived ? "survived; certificate failed" : "repair broken"}.`,true);
  } else if (event.type === "cycle_completed") {
    addLog(`Cycle ${event.cycle} complete. Beginning a new conjecture…`,true);
  } else if (event.type === "agent_started") {
    node?.classList.remove("done","failed"); node?.classList.add("active"); node?.querySelector("em").replaceChildren("thinking");
    addLog(`${event.agent.toUpperCase()} started.`, true);
  } else if (event.type === "agent_prompt") {
    addLog(`${event.agent.toUpperCase()} → CODEX INPUT\nModel: ${event.model} · Reasoning: ${event.reasoning_effort}\n\n${event.prompt}`,true);
  } else if (event.type === "codex_output") {
    const message=String(event.message||"").trim();
    const label=event.kind==="thought" ? "CODEX THINKING" : event.kind==="structured" ? "CODEX STRUCTURED OUTPUT" : "CODEX OUTPUT";
    if(message) addLog(`${event.agent.toUpperCase()} → ${label}\n${message}`,event.kind!=="thought");
  } else if (event.type === "ai_usage") {
    usageStats.tokens+=event.ai_tokens||0; agentStats(event.agent).tokens+=event.ai_tokens||0; showUsageStats(event.agent);
  } else if (event.type === "wolfram_call") {
    usageStats.wolfram+=1; agentStats(event.agent).wolfram+=1; showUsageStats(event.agent);
    addLog(`${event.agent.toUpperCase()} → WOLFRAM INPUT\n${event.expression}`);
    if(event.result!=null) addLog(`WOLFRAM → ${event.agent.toUpperCase()} OUTPUT\n${logValue(event.result)}`,true);
  } else if (event.type === "agent_completed") {
    node?.classList.remove("active"); node?.classList.add("done"); node?.querySelector("em").replaceChildren("complete");
    showUsageStats(event.agent);
    addLog(`${event.agent.toUpperCase()} complete.`, true);
  } else if (event.type === "agent_report") {
    addLog(`${event.agent.toUpperCase()} discovered: ${event.title}`,true);
    (event.evidence_notes||[]).forEach(note=>addLog(`Evidence: ${note}`));
  } else if (event.type === "certificate_started") {
    node?.classList.add("active"); node?.querySelector("em").replaceChildren("rechecking proof"); addLog("KERNEL REFEREE independently evaluating certificate.", true);
  } else if (event.type === "certificate_completed") {
    node?.classList.remove("active"); node?.classList.add(event.passed ? "done" : "failed"); node?.querySelector("em").replaceChildren(event.passed ? "certified" : "rejected");
    addLog(`Certificate ${event.passed ? "PASSED" : "FAILED"}: ${event.result}`, true);
  }
}

function mathBlocks(items) {
  return items.map(item => {
    const div=document.createElement("div"); div.className="math";
    const code=document.createElement("code"); code.textContent=`${item.expression}\n→ ${item.result}`;
    const small=document.createElement("small"); small.textContent=item.interpretation;
    div.append(code,small); return div;
  });
}

function concise(value, limit=220) {
  const text=String(value||"");
  return text.length>limit ? `${text.slice(0, limit).trim()}…` : text;
}

function render(report, keepRunning=false) {
  $("conjecture").textContent=report.explorer.conjecture;
  $("definition").textContent=report.explorer.object_definition;
  $("plain-summary").textContent=report.explorer.plain_english_summary||report.explorer.why_it_looks_true;
  $("evidence").replaceChildren(...mathBlocks(report.explorer.wolfram_evidence));
  $("falsifier-tag").textContent=report.falsifier.verdict==="falsified" ? "DESTROYED" : "SURVIVED BOUNDED SEARCH";
  $("counterexample").textContent=report.falsifier.verdict==="falsified" ? report.falsifier.smallest_counterexample : "No counterexample found in bounded search";
  $("falsifier-coverage").textContent=[report.falsifier.domain_model,report.falsifier.simplicity_ordering,report.falsifier.search_range,report.falsifier.uncovered_regions].filter(Boolean).join(" · ");
  $("falsifier-math").replaceChildren(...mathBlocks(report.falsifier.wolfram_checks));
  $("repair").textContent=concise(report.proofsmith.repaired_conjecture, 170);
  $("proof").replaceChildren(...[`Full statement: ${report.proofsmith.repaired_conjecture}`,...report.proofsmith.proof_outline].map(step=>{const li=document.createElement("li");li.textContent=step;return li;}));
  $("proof-math").replaceChildren(...mathBlocks(report.proofsmith.wolfram_checks));
  $("cert-expression").textContent=`${report.certificate.expression}  →  ${report.certificate.actual}`;
  const metrics=report.metrics||{};
  const tokens=metrics.ai_tokens==null ? "?" : Number(metrics.ai_tokens).toLocaleString();
  $("cert-status").textContent=report.certificate.passed ? `✓ CERTIFIED · ${tokens} AI tokens (Sol high) · ${metrics.wolfram_calls??"?"} Wolfram MCP calls` : `✕ MAX ROUNDS · ${tokens} AI tokens (Sol high) · ${metrics.wolfram_calls??"?"} Wolfram MCP calls`;
  $("certificate").classList.toggle("fail", !report.certificate.passed);
  if(!keepRunning) $("run").classList.add("hidden");
  $("result").classList.remove("hidden");
  if(!keepRunning) $("result").scrollIntoView({behavior:"smooth",block:"start"});
}

async function poll(jobId) {
  let response;
  try {
    response=await fetch(`${API_ROOT}/api/jobs/${jobId}`, {cache:"no-store"});
    networkFailures=0;
  } catch(error) {
    networkFailures+=1;
    if(networkFailures<=8) {
      if(networkFailures===1) addLog("Connection interrupted; retrying the local society server…",true);
      return;
    }
    throw new Error("The local society server stopped responding. Restart python3 app.py, then convene the session again.");
  }
  const job=await response.json();
  if(response.status===404) throw new Error("The local server restarted and lost this research session. Convene the society again to resume with a fresh run.");
  if(!response.ok) throw new Error(job.error||"Could not read research session");
  const freshEvents=job.events.filter(event=>(event.id||0)>seenEvents);
  freshEvents.forEach(handleEvent);
  if(freshEvents.length) seenEvents=Math.max(...freshEvents.map(event=>event.id||0));
  if(job.cycles_completed>renderedCycles && job.result) { renderedCycles=job.cycles_completed; render(job.result,true); }
  if(job.status==="completed") { clearInterval(poller); clearInterval(clock); if(job.result) render(job.result); $("ignite").disabled=false; $("stop").disabled=false; $("stop").textContent="STOP"; currentJobId=null; }
  if(job.status==="failed") throw new Error(job.error||"Research session failed");
}

$("forge-form").addEventListener("submit", async event => {
  event.preventDefault(); clearInterval(poller); clearInterval(clock); seenEvents=0; networkFailures=0; renderedCycles=0;
  const topic="";
  resetCards();
  $("log").replaceChildren(); addLog(topic ? "Convening the AImerican Mathematical Society…" : "Explorer hallucinating a research direction…",true); $("result").classList.add("hidden"); $("error").classList.add("hidden"); $("run").classList.remove("hidden"); $("ignite").disabled=true; $("stop").disabled=false; $("stop").textContent="STOP"; $("cycle-label").textContent="Cycle 1";
  requestAnimationFrame(() => $("run").scrollIntoView({
    behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    block: "start"
  }));
  startedAt=Date.now(); clock=setInterval(()=>{const s=Math.floor((Date.now()-startedAt)/1000);$("timer").textContent=`${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;},1000);
  try {
    const response=await fetch(`${API_ROOT}/api/forge`,{method:"POST",cache:"no-store",headers:{"Content-Type":"application/json"},body:JSON.stringify({topic,attack_budget:ATTACK_BUDGET,max_rounds:MAX_REPAIR_ROUNDS})});
    const body=await response.json(); if(!response.ok) throw new Error(body.error||"Could not convene the society");
    currentJobId=body.job_id;
    poller=setInterval(()=>poll(body.job_id).catch(fail),1800); await poll(body.job_id);
  } catch(error) { fail(error); }
});

function fail(error) { clearInterval(poller);clearInterval(clock);$("ignite").disabled=false;$("stop").disabled=false;$("stop").textContent="STOP";currentJobId=null;const message=error?.message||String(error);$("error").textContent=message;$("error").classList.remove("hidden");addLog(`ERROR: ${message}`,true); }
