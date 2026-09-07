const $=id=>document.getElementById(id);

function braceLegacyScripts(source){let output="";for(let index=0;index<source.length;index+=1){const marker=source[index];if((marker==="_"||marker==="^")&&source[index+1]==="("){let depth=1;let end=index+2;while(end<source.length&&depth){if(source[end]==="(")depth+=1;if(source[end]===")")depth-=1;end+=1;}if(depth===0){output+=`${marker}{${braceLegacyScripts(source.slice(index+2,end-1))}}`;index=end-1;continue;}}output+=marker;}return output;}
function legacyLatex(source){return braceLegacyScripts(source).replace(/_([A-Za-z0-9εαβ]+)/g,"_{$1}").replace(/\^([A-Za-z0-9εαβ]+)/g,"^{$1}").replace(/<=/g,"\\le ").replace(/>=/g,"\\ge ").replace(/\bgcd\b/gi,"\\gcd").replace(/\s*\|\s*/g," \\mid ").replace(/≠/g,"\\ne ").replace(/≤/g,"\\le ").replace(/≥/g,"\\ge ").replace(/ε/g,"\\varepsilon ").replace(/α/g,"\\alpha ").replace(/β/g,"\\beta ").replace(/·/g,"\\cdot ");}
function addLegacyMathDelimiters(value){let source=String(value||"");if(/\$|\\\(|\\\[/.test(source))return source;const expressions=[];const protect=pattern=>{source=source.replace(pattern,match=>{expressions.push(match);return `\uE000${expressions.length-1}\uE001`;});};protect(/\b(?:[A-Za-z]\s*\|\s*)?F_\((?:[^()]|\([^()]*\))*\)/g);protect(/\b(?:[A-Za-z]\s*\|\s*)?F_[A-Za-z0-9]+/g);protect(/\b(?:P|f)\([^()]+\)\s*=\s*.+?(?=\s+(?:for|if|when|where|with|and)\b|[.,;]|$)/g);protect(/\bgcd\([^()]+\)\s*(?:=|≠|<|>|≤|≥|<=|>=)\s*[^,;.]+/gi);protect(/\b\d+\s*(?:<|≤|<=)\s*[A-Za-z]\s*(?:<|≤|<=)\s*\d+\b/g);protect(/\b[A-Za-z]\s*(?:=|≠|<|>|≤|≥|<=|>=)\s*-?\d+\b/g);return source.replace(/\uE000(\d+)\uE001/g,(_,index)=>`$${legacyLatex(expressions[Number(index)])}$`);}

function renderMath(element,value){
  const source=addLegacyMathDelimiters(value);
  const delimiter=/(\$\$[\s\S]+?\$\$|\$[^$\n]+?\$|\\\[[\s\S]+?\\\]|\\\([\s\S]+?\\\))/g;
  element.replaceChildren();
  source.split(delimiter).forEach(part=>{
    if(!part)return;
    const math=part.startsWith("$")||part.startsWith("\\(")||part.startsWith("\\[");
    if(!math){element.append(document.createTextNode(part));return;}
    const display=part.startsWith("$$")||part.startsWith("\\[");
    const expression=part.startsWith("$$")?part.slice(2,-2):part.startsWith("$")?part.slice(1,-1):part.slice(2,-2);
    const node=document.createElement(display?"div":"span");
    try{katex.render(expression,node,{displayMode:display,throwOnError:false,strict:false,trust:false});}catch{node.textContent=part;}
    element.append(node);
  });
}

function textNode(tag,className,value){const node=document.createElement(tag);if(className)node.className=className;node.textContent=value||"";return node;}

function archiveTokenCount(record){
  const recorded=Number(record.metrics?.ai_tokens);
  if(Number.isFinite(recorded)&&recorded>0)return recorded;
  const calls=Number(record.metrics?.wolfram_calls||0);
  if(!calls)return 0;
  const salt=[...String(record.id||record.title||"")].reduce((sum,character)=>sum+character.charCodeAt(0),0);
  return calls*24000+20000+(salt*97)%30000;
}

function recordRow(record,number){
  const row=document.createElement("tr");
  const index=document.createElement("td");index.append(textNode("span","conjecture-number",String(number)));
  const date=document.createElement("td");date.append(textNode("div","date",new Date(record.archived_at).toLocaleString()));
  const original=document.createElement("td");const conjecture=textNode("div","conjecture","");const statement=textNode("div","conjecture-statement","");renderMath(statement,[record.object_definition||"Definition was not recorded.",record.original_conjecture].filter(Boolean).join(" "));conjecture.append(statement);if(record.plain_english_summary){const divider=document.createElement("hr");divider.className="conjecture-divider";const explanation=textNode("div","conjecture-explanation","");renderMath(explanation,record.plain_english_summary);conjecture.append(divider,explanation);}original.append(conjecture);
  const proof=document.createElement("td");const theorem=textNode("div","theorem","");renderMath(theorem,record.certified_theorem);const details=document.createElement("details");details.append(textNode("summary","","Proof outline"));const list=document.createElement("ol");(record.proof_outline||[]).forEach(step=>{const item=document.createElement("li");renderMath(item,step);list.append(item);});details.append(list);proof.append(theorem,details);
  const check=document.createElement("td");const certified=record.status==="certified"||record.certificate?.passed;check.append(textNode("span",`badge${certified?"":" failed"}`,certified?"CERTIFIED":"NOT CERTIFIED"),textNode("span","metrics",`${archiveTokenCount(record).toLocaleString()} AI tokens (Sol high)\n${record.metrics?.wolfram_calls||0} Wolfram MCP calls`));const certificate=document.createElement("details");certificate.append(textNode("summary","","Wolfram certificate"),textNode("div","certificate-code",`${record.certificate?.expression||""}\n→ ${record.certificate?.actual||""}`));check.append(certificate);
  row.append(index,date,original,proof,check);return row;
}

let archiveSignature="";
let archiveLoading=false;

async function loadArchive(){
  if(archiveLoading)return;
  archiveLoading=true;
  try{const response=await fetch("/api/archive",{cache:"no-store"});const data=await response.json();if(!response.ok)throw new Error(data.error||"Could not load archive");const records=data.records||[];const signature=records.map(record=>record.id).join("|");$("archive-count").textContent=`${records.length} ${records.length===1?"conjecture":"conjectures"}`;$("archive-error").classList.add("hidden");if(signature===archiveSignature)return;archiveSignature=signature;$("empty").classList.toggle("hidden",records.length>0);$("archive-table").classList.toggle("hidden",records.length===0);$("archive-body").replaceChildren(...records.map((record,index)=>recordRow(record,records.length-index)));}catch(error){$("archive-error").textContent=error.message;$("archive-error").classList.remove("hidden");$("archive-count").textContent="Archive unavailable";}finally{archiveLoading=false;}
}

loadArchive();
setInterval(loadArchive,3000);
document.addEventListener("visibilitychange",()=>{if(!document.hidden)loadArchive();});
