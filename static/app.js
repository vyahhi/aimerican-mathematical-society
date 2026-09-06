const $ = id => document.getElementById(id);
const API_ROOT = location.protocol === "file:" ? "http://127.0.0.1:8765" : "";
let poller = null;
let clock = null;
let startedAt = 0;
let seenEvents = 0;
let networkFailures = 0;
let currentJobId = null;
let renderedCycles = 0;
let currentDefinition = "";
let currentClaim = "";
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

function addLog(message, hot=false, technical=false) {
  const row = document.createElement("p");
  const stamp = document.createElement("time");
  stamp.textContent = new Date().toLocaleTimeString([], {hour12:false});
  row.append(stamp, document.createTextNode(message));
  if (hot) row.classList.add("hot");
  if (technical) row.classList.add("technical");
  $("log").append(row); $("log").scrollTop = $("log").scrollHeight;
}

function logValue(value) {
  if(value==null) return "";
  if(typeof value==="string") {
    const trimmed=value.trim();
    if((trimmed.startsWith("{")&&trimmed.endsWith("}"))||(trimmed.startsWith("[")&&trimmed.endsWith("]"))) {
      try { return logValue(JSON.parse(trimmed)); } catch { return value; }
    }
    return value;
  }
  if(Array.isArray(value)) return value.map(logValue).filter(Boolean).join("\n");
  if(typeof value==="object") {
    const content=Array.isArray(value.content) ? value.content : [];
    const text=content.filter(item=>item&&item.type==="text"&&item.text!=null).map(item=>String(item.text)).join("\n");
    if(text) return text;
    if(value.text!=null) return String(value.text);
    if(value.result!=null) return logValue(value.result);
  }
  try { return JSON.stringify(value,null,2); } catch { return String(value); }
}

function braceLegacyScripts(source) {
  let output="";
  for(let index=0;index<source.length;index+=1) {
    const marker=source[index];
    if((marker==="_"||marker==="^")&&source[index+1]==="(") {
      let depth=1; let end=index+2;
      while(end<source.length&&depth) {
        if(source[end]==="(") depth+=1;
        if(source[end]===")") depth-=1;
        end+=1;
      }
      if(depth===0) {
        output+=`${marker}{${braceLegacyScripts(source.slice(index+2,end-1))}}`;
        index=end-1;
        continue;
      }
    }
    output+=marker;
  }
  return output;
}

function legacyLatex(source) {
  return braceLegacyScripts(source)
    .replace(/_([A-Za-z0-9εαβ]+)/g,"_{$1}")
    .replace(/\^([A-Za-z0-9εαβ]+)/g,"^{$1}")
    .replace(/\bgcd\b/gi,"\\gcd")
    .replace(/\s*\|\s*/g," \\mid ")
    .replace(/≠/g,"\\ne ")
    .replace(/≤/g,"\\le ")
    .replace(/≥/g,"\\ge ")
    .replace(/ε/g,"\\varepsilon ")
    .replace(/α/g,"\\alpha ")
    .replace(/β/g,"\\beta ")
    .replace(/·/g,"\\cdot ");
}

function addLegacyMathDelimiters(value) {
  let source=String(value||"");
  if(/\$|\\\(|\\\[/.test(source)) return source;
  const expressions=[];
  const protect=pattern=>{source=source.replace(pattern,match=>{expressions.push(match);return `\uE000${expressions.length-1}\uE001`;});};
  protect(/\b(?:[A-Za-z]\s*\|\s*)?F_\((?:[^()]|\([^()]*\))*\)/g);
  protect(/\b(?:[A-Za-z]\s*\|\s*)?F_[A-Za-z0-9]+/g);
  protect(/\bgcd\([^()]+\)\s*(?:=|≠|<|>|≤|≥)\s*[^,;.]+/gi);
  protect(/\b\d+\s*(?:<|≤)\s*[A-Za-z]\s*(?:<|≤)\s*\d+\b/g);
  protect(/\b[A-Za-z]\s*(?:=|≠|<|>|≤|≥)\s*-?\d+\b/g);
  protect(/(?:\([^\s,;.]+\)|\b\d*[A-Za-z])\^[A-Za-z0-9()\-+]+(?:\s*[+\-=·]\s*(?:\([^\s,;.]+\)|\d*[A-Za-z](?:\^[A-Za-z0-9()\-+]+)?|\d+)){1,}/g);
  return source.replace(/\uE000(\d+)\uE001/g,(_,index)=>`$${legacyLatex(expressions[Number(index)])}$`);
}

function renderMathText(element, value) {
  const source=addLegacyMathDelimiters(value);
  const delimiters=/(\$\$[\s\S]+?\$\$|\$[^$\n]+?\$|\\\[[\s\S]+?\\\]|\\\([\s\S]+?\\\))/g;
  element.replaceChildren();
  source.split(delimiters).forEach(part=>{
    if(!part) return;
    const display=part.startsWith("$$")||part.startsWith("\\[");
    const inline=part.startsWith("$")||part.startsWith("\\(");
    if(!display&&!inline) { element.append(document.createTextNode(part)); return; }
    const expression=part.startsWith("$$") ? part.slice(2,-2) : part.startsWith("$") ? part.slice(1,-1) : part.slice(2,-2);
    const span=document.createElement(display ? "div" : "span");
    try {
      if(!window.katex) throw new Error("KaTeX unavailable");
      window.katex.render(expression,span,{displayMode:display,throwOnError:false,strict:false,trust:false});
    } catch { span.textContent=part; }
    element.append(span);
  });
}

function setResearchState(stage, brief) {
  $("research-stage").textContent=stage;
  renderMathText($("research-brief"),brief);
}

function definedClaim(definition, claim) {
  const object=String(definition||"").trim();
  const statement=String(claim||"").trim();
  if(!object)return statement;
  if(!statement||statement.includes(object))return statement||object;
  return `${object}\n\n${statement}`;
}

function updateResearchFromReport(agent, message) {
  let report;
  try { report=JSON.parse(message); } catch { return; }
  if(agent==="explorer" && report.conjecture) {
    currentDefinition=report.object_definition||"";
    currentClaim=report.conjecture;
    setResearchState("Proposed",definedClaim(currentDefinition,currentClaim));
  } else if(agent==="falsifier") {
    if(report.verdict==="falsified") {
      setResearchState("Counterexample found",definedClaim(currentDefinition,report.smallest_counterexample||report.counterexample_explanation||"The conjecture broke; a repair is next."));
    } else {
      setResearchState("Attack survived",definedClaim(currentDefinition,currentClaim)||"No counterexample found in this attack.");
    }
  } else if(agent==="prover" && report.repaired_conjecture) {
    currentClaim=report.repaired_conjecture;
    setResearchState("Testing repair",definedClaim(currentDefinition,currentClaim));
  }
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
    currentDefinition=""; currentClaim="";
    setResearchState("Exploring","Choosing a mathematical direction…");
    addLog(`Cycle ${event.cycle}: Explorer hallucinating a conjecture.`,true);
  } else if (event.type === "round_started") {
    $("cycle-label").textContent=`Cycle ${event.cycle} · Round ${event.round}/${event.max_rounds}`;
    setResearchState("Repairing",definedClaim(currentDefinition,currentClaim)||"Turning the failed conjecture into a stronger theorem…");
    addLog(`Repair round ${event.round}/${event.max_rounds}.`,true);
  } else if (event.type === "round_completed") {
    addLog(`Round ${event.round}: ${event.certified ? "certified" : event.survived ? "survived; certificate failed" : "repair broken"}.`,true);
  } else if (event.type === "cycle_completed") {
    setResearchState("Cycle complete",definedClaim(currentDefinition,currentClaim)||"Preparing the next conjecture…");
    addLog(`Cycle ${event.cycle} complete. Beginning a new conjecture…`,true);
  } else if (event.type === "agent_started") {
    node?.classList.remove("done","failed"); node?.classList.add("active"); node?.querySelector("em").replaceChildren("thinking");
    if(event.agent==="explorer") setResearchState("Exploring","Looking for a mathematical pattern worth testing…");
    if(event.agent==="falsifier") setResearchState("Stress-testing",definedClaim(currentDefinition,currentClaim)||"Translating the proposed claim into exact attacks…");
    if(event.agent==="prover") setResearchState("Repairing",definedClaim(currentDefinition,currentClaim)||"Building a corrected theorem…");
    addLog(`${event.agent.toUpperCase()} started.`, true);
  } else if (event.type === "agent_prompt") {
    addLog(`${event.agent.toUpperCase()} → CODEX INPUT\nModel: ${event.model} · Reasoning: ${event.reasoning_effort}\n\n${event.prompt}`,true);
  } else if (event.type === "codex_output") {
    const message=String(event.message||"").trim();
    const label=event.kind==="thought" ? "CODEX THINKING" : event.kind==="structured" ? "CODEX STRUCTURED OUTPUT" : "CODEX OUTPUT";
    if(event.kind==="structured") updateResearchFromReport(event.agent,message);
    if(message) addLog(`${event.agent.toUpperCase()} → ${label}\n${message}`,event.kind!=="thought");
  } else if (event.type === "ai_usage") {
    usageStats.tokens+=event.ai_tokens||0; agentStats(event.agent).tokens+=event.ai_tokens||0; showUsageStats(event.agent);
  } else if (event.type === "wolfram_call") {
    usageStats.wolfram+=1; agentStats(event.agent).wolfram+=1; showUsageStats(event.agent);
    addLog(`${event.agent.toUpperCase()} → WOLFRAM INPUT\n${event.expression}`,false,true);
    if(event.result!=null) addLog(`WOLFRAM → ${event.agent.toUpperCase()} OUTPUT\n${logValue(event.result)}`,true,true);
  } else if (event.type === "agent_completed") {
    node?.classList.remove("active"); node?.classList.add("done"); node?.querySelector("em").replaceChildren("complete");
    showUsageStats(event.agent);
    addLog(`${event.agent.toUpperCase()} complete.`, true);
  } else if (event.type === "agent_report") {
    if(event.agent==="explorer" && event.conjecture) { currentDefinition=event.object_definition||currentDefinition; currentClaim=event.conjecture; setResearchState("Proposed",definedClaim(currentDefinition,currentClaim)); }
    addLog(`${event.agent.toUpperCase()} discovered: ${event.title}`,true);
    (event.evidence_notes||[]).forEach(note=>addLog(`Evidence: ${note}`));
  } else if (event.type === "certificate_started") {
    node?.classList.add("active"); node?.querySelector("em").replaceChildren("rechecking proof"); setResearchState("Certifying",definedClaim(currentDefinition,currentClaim)||"Independently checking the repaired theorem…"); addLog("KERNEL REFEREE independently evaluating certificate.", true);
  } else if (event.type === "certificate_completed") {
    node?.classList.remove("active"); node?.classList.add(event.passed ? "done" : "failed"); node?.querySelector("em").replaceChildren(event.passed ? "certified" : "rejected");
    setResearchState(event.passed ? "Certified" : "Certificate failed",event.passed ? definedClaim(currentDefinition,currentClaim) : "The current repair did not certify; another repair round is next.");
    addLog(`Certificate ${event.passed ? "PASSED" : "FAILED"}: ${event.result}`, true);
  } else if (event.type === "archive_saved") {
    addLog(`Saved to All Conjectures (${event.status}): ${event.title}`,true);
  }
}

function mathBlocks(items) {
  return items.map(item => {
    const div=document.createElement("div"); div.className="math";
    const code=document.createElement("code"); code.textContent=`${item.expression}\n→ ${item.result}`;
    const small=document.createElement("small"); renderMathText(small,item.interpretation);
    div.append(code,small); return div;
  });
}

function concise(value, limit=220) {
  const text=String(value||"");
  return text.length>limit ? `${text.slice(0, limit).trim()}…` : text;
}

function render(report, keepRunning=false) {
  renderMathText($("conjecture"),report.explorer.conjecture);
  renderMathText($("definition"),report.explorer.object_definition);
  renderMathText($("plain-summary"),report.explorer.plain_english_summary||report.explorer.why_it_looks_true);
  $("evidence").replaceChildren(...mathBlocks(report.explorer.wolfram_evidence));
  $("falsifier-tag").textContent=report.falsifier.verdict==="falsified" ? "DESTROYED" : "SURVIVED BOUNDED SEARCH";
  renderMathText($("counterexample"),report.falsifier.verdict==="falsified" ? report.falsifier.smallest_counterexample : "No counterexample found in bounded search");
  renderMathText($("falsifier-coverage"),[report.falsifier.domain_model,report.falsifier.simplicity_ordering,report.falsifier.search_range,report.falsifier.uncovered_regions].filter(Boolean).join(" · "));
  $("falsifier-math").replaceChildren(...mathBlocks(report.falsifier.wolfram_checks));
  renderMathText($("repair"),concise(report.prover.repaired_conjecture,170));
  $("proof").replaceChildren(...[`Full statement: ${report.prover.repaired_conjecture}`,...report.prover.proof_outline].map(step=>{const li=document.createElement("li");renderMathText(li,step);return li;}));
  $("proof-math").replaceChildren(...mathBlocks(report.prover.wolfram_checks));
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
  currentDefinition=""; currentClaim=""; setResearchState("Exploring","Choosing a mathematical direction…");
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
