"use strict";

const MAX_QUESTIONS = 14;
const CORE_QUESTION_COUNT = 7;
const MAX_PRIMARY_BRANCHES = 1;
const MAX_MODIFIERS = 2;

const STAGES = ["You", "The Pain", "The Pattern", "The Team", "The Opportunity"];
const $ = (selector) => document.querySelector(selector);
const option = (value, label = value) => ({ value, label });

const PAINS = {
  financial: "numbers that arrive too late or cannot be trusted",
  labor: "labor and scheduling surprises",
  inventory: "an unreliable food-cost and inventory foundation",
  admin: "manager reporting and administrative burden",
  accountability: "follow-through that breaks after issues are identified",
  guest: "repeat guest issues and inconsistent recovery",
  sales: "valuable sales and event opportunities falling through the cracks",
  systems: "too many systems and no clear operating picture",
  strong: "finding the next opportunity in an already strong operation",
  other: "a recurring operating issue that does not fit a standard category"
};

const SCENARIOS = {
  financial: { name: "Financial visibility & reporting", theme: "You may not need another report. The opportunity may be trusted definitions, exception-first visibility, and a clear action path.", milestone: "Agree on one trusted definition and use it to produce one decision-ready view.", questions: [
    ["fin_reports", "Which reports deserve the most trust?", "Choose up to two.", ["Sales", "Labor", "P&L", "Cash", "Inventory", "Discounts, voids & comps"], "multi", 2],
    ["fin_frequency", "How often do reports arrive late, conflict, or need manual reconciliation?", "", ["Rarely", "Monthly", "Weekly", "Daily"]],
    ["fin_after", "What usually happens after the report arrives?", "", ["A decision or action", "Discussion only", "More investigation", "The next step is unclear"]],
    ["fin_pain", "Which friction costs the most attention?", "", ["Not seeing risk early", "Not trusting totals", "Too much detail", "No ownership after the signal"]]
  ] },
  labor: { name: "Labor, scheduling & overtime", theme: "The opportunity may be earlier visibility and manager-owned correction—not simply cutting hours.", milestone: "Agree on one labor exception and context standard across all locations.", questions: [
    ["labor_primary", "Where does labor create the most pressure?", "", ["Overtime", "Schedule versus demand", "Last-minute staffing", "Payroll corrections", "Manager time", "Inconsistent location practices"]],
    ["labor_when", "When do you usually learn about the issue?", "", ["Before schedule publish", "Before service", "After the week", "At payroll", "At period close"]],
    ["labor_view", "Do managers see sales demand and labor expectations together?", "", ["Always", "Sometimes", "Rarely"]],
    ["labor_result", "What would matter most?", "", ["Earlier warning", "Better schedule discipline", "Fewer corrections", "Fairer context", "Less owner involvement"]]
  ] },
  inventory: { name: "Inventory, recipes & margin", theme: "Before searching for margin leaks, the first opportunity may be establishing a trustworthy cost foundation.", milestone: "Reconcile one representative inventory category from purchase unit through recipe usage.", questions: [
    ["inv_foundation", "Which part of the cost foundation feels weakest?", "", ["Count discipline", "Invoice accuracy", "Recipe cards", "Yields", "Unit conversions", "Pricing", "Waste", "Purchasing"]],
    ["inv_schedule", "How consistently are inventories completed on schedule?", "", ["Consistently", "Usually", "Inconsistently", "Rarely"]],
    ["inv_recipe", "Are recipe costs current and used in decisions?", "", ["Yes", "Partly", "No", "Unsure"]],
    ["inv_result", "Which result would be most useful?", "", ["Trustworthy food cost", "Better menu decisions", "Purchasing control", "Clearer accountability", "Less admin"]]
  ] },
  admin: { name: "Manager administrative burden", theme: "The first win may be removing administrative friction so managers can return to guests and teams.", milestone: "Remove or simplify one recurring report and measure the manager time returned.", questions: [
    ["admin_time", "About how many hours does a manager spend each week on reporting, searching, and routine admin?", "A directional range is enough.", ["Under 3 hours", "3\u20135 hours", "6\u201310 hours", "More than 10 hours", "Unsure"]],
    ["admin_burden", "What creates the largest burden?", "", ["Reports", "Scheduling", "Payroll inputs", "Inventory", "Meetings", "Email", "Approvals", "Guest follow-up"]],
    ["admin_repeat", "Where is work repeated most often?", "", ["Across locations", "Across systems", "Between managers and leaders", "In several reports", "It is unclear"]],
    ["admin_return", "What would managers do with five returned hours?", "", ["Spend time with guests", "Coach the team", "Protect standards", "Build sales", "Plan ahead", "Improve personal sustainability"]]
  ] },
  accountability: { name: "Accountability & follow-through", theme: "The opportunity may be consistent, transparent accountability that feels less personal and gives managers more autonomy.", milestone: "Give every aged action one owner, one deadline, and visible proof of completion.", questions: [
    ["acct_origin", "Where do commitments usually begin?", "", ["Meetings", "Email", "Manager logs", "Projects", "Texts or chat", "Reports"]],
    ["acct_complete", "How often does an action have an owner, deadline, proof, and escalation path?", "", ["Almost always", "Usually", "Sometimes", "Rarely"]],
    ["acct_open", "Why do items tend to remain open?", "", ["Unclear owner", "Priority conflict", "No authority", "No follow-up", "Weak proof", "Too many tools"]],
    ["acct_experience", "How do managers experience accountability today?", "", ["Clear", "Inconsistent", "Personal or defensive", "Unclear"]]
  ] },
  guest: { name: "Guest experience & recovery", theme: "The opportunity may be connecting individual recovery with repeat-pattern learning\u2014without drowning managers in alerts.", milestone: "Choose one repeat guest signal, assign an owner, and agree when it deserves escalation.", questions: [
    ["guest_signals", "Where do guest signals live today?", "Choose up to two.", ["Reviews", "Surveys", "Email", "Reservations", "Manager notes", "Support tickets", "Several places"], "multi", 2],
    ["guest_speed", "How quickly are serious issues owned?", "", ["Same shift", "Within 24 hours", "Inconsistently", "It is unclear"]],
    ["guest_themes", "Are repeat themes identified across locations?", "", ["Consistently", "Sometimes", "Rarely"]],
    ["guest_result", "What would matter most?", "", ["Faster recovery", "Repeat-theme visibility", "Clearer ownership", "Manager coaching", "Protecting hospitality time"]]
  ] },
  sales: { name: "Sales, events & revenue follow-through", theme: "The opportunity may be less about generating more leads and more about protecting valuable opportunities already present.", milestone: "Give every qualified opportunity a next action, owner, and due date.", questions: [
    ["sales_leak", "Where does the most valuable opportunity leak occur?", "", ["Missed inquiries", "Slow responses", "No next step", "Stale proposals", "Weak handoff", "Unclear source performance"]],
    ["sales_home", "Where do leads live today?", "", ["CRM", "Email", "Events platform", "Spreadsheets", "Several places"]],
    ["sales_assigned", "Is each qualified opportunity assigned with a next action and due date?", "", ["Yes", "Mostly", "Inconsistently", "No"]],
    ["sales_result", "What would create the most value?", "", ["Response speed", "Ownership", "Conversion visibility", "Follow-up consistency", "Forecast clarity"]]
  ] },
  systems: { name: "Fragmented systems & executive overload", theme: "The business may not need a platform replacement. It may need a decision layer across the tools already in place.", milestone: "Reconcile one operating week and produce one five-item decision queue.", questions: [
    ["sys_count", "How many systems must leadership consult for a normal operating read?", "", ["1\u20133", "4\u20136", "7\u201310", "11+"]],
    ["sys_hard", "What is hardest about assembling the picture?", "", ["Finding data", "Reconciling it", "Knowing what matters", "Assigning action", "Tracking closure"]],
    ["sys_defs", "Are important definitions consistent across systems?", "", ["Yes", "Partly", "No", "Unsure"]],
    ["sys_help", "What would help leadership most?", "", ["One brief", "A decision queue", "Exception alerts", "Action routing", "Automated reconciliation"]]
  ] },
  strong: { name: "A strong operation seeking leverage", theme: "The opportunity is not repair. It may be protecting strengths while finding hidden leverage and returning leadership time.", milestone: "Identify one high-value decision to delegate with clear boundaries and proof.", questions: [
    ["strong_protect", "What works especially well and must be protected?", "", ["Guest loyalty", "Team culture", "Manager ownership", "Operational consistency", "Financial discipline", "Growth momentum"]],
    ["strong_value", "Where might untapped value be hiding?", "", ["Pricing", "Menu", "Labor deployment", "Guest loyalty", "Sales", "Manager development", "Automation", "Growth"]],
    ["strong_effort", "Which recurring effort may no longer earn its keep?", "", ["A report", "A meeting", "An approval", "A manual handoff", "A reconciliation", "Unsure"]],
    ["strong_hours", "Where would five more leadership hours create the most value?", "", ["Growth", "Manager development", "Guest experience", "Strategic planning", "Concept development"]]
  ] },
  other: { name: "Your recurring operating pattern", theme: "Your language should lead. The opportunity is to bound the recurring pattern before forcing it into a category.", milestone: "Agree on one observable situation, its frequency, and one meaningful sign of movement.", questions: [
    ["other_person", "Who experiences this recurring situation most?", "", ["Owners or executives", "Operations leaders", "Managers", "Frontline team", "Guests", "Several groups"]],
    ["other_frequency", "How often does it occur?", "", ["Daily", "Weekly", "Monthly", "Occasionally", "It is unclear"]],
    ["other_consequence", "Which consequence matters most?", "", ["Lost time", "Uncertain decisions", "Financial performance", "Guest experience", "Team energy", "Missed growth"]],
    ["other_tried", "What best describes what has already been tried?", "", ["A process change", "A new tool", "More reporting", "More meetings", "Informal coaching", "Nothing structured yet"]]
  ] }
};

const CORE = [
  { id:"role", stage:0, title:"Which description is closest to your role?", options:[option("owner","Owner / Founder"),option("ceo","CEO / President"),option("ops","COO / VP of Operations"),option("director","Regional / Director of Operations"),option("finance","Finance leader"),option("gm","General Manager"),option("other","Other")] },
  { id:"locations", stage:0, title:"What are you operating today?", options:["1 location","2\u20133 locations","4\u20136 locations","7\u201310 locations","11+ locations"].map(x=>option(x)) },
  { id:"pain", stage:1, title:"What is the problem you keep carrying home?", help:"Choose the one recurring issue the business has discussed but has not permanently fixed.", options:Object.entries(PAINS).map(([value,label])=>option(value,label.charAt(0).toUpperCase()+label.slice(1))) },
  { id:"consequence", stage:1, title:"What does this recurring issue take away?", help:"Choose up to two.", type:"multi", max:2, options:["Time","Confidence in decisions","Peace of mind","Financial performance","Guest experience","Team morale","Manager development","Growth opportunities","Personal energy"].map(x=>option(x)) },
  { id:"desired", stage:4, title:"If this were meaningfully under control 30 days from now, what would feel different?", options:["I would know what deserves my attention","Reports would arrive on time and reconcile","Managers would have clearer ownership","Fewer issues would need senior intervention","Managers would have more guest and team time","We would stop repeating the same conversations","We would see exceptions earlier","More opportunities would become visible"].map(x=>option(x)) },
  { id:"constraint", stage:3, title:"What has prevented this from being solved so far?", options:["We do not have reliable information","Information exists but is scattered","No one clearly owns the outcome","Managers lack time or authority","The process is inconsistent across locations","We tried a solution, but it did not hold","The issue competes with too many other priorities","We do not yet understand the root cause"].map(x=>option(x)) },
  { id:"readiness", stage:4, title:"Which statement best describes where you are now?", options:["Ready to assess and act","Ready to understand the opportunity first","Interested, but need internal alignment","Exploring with no current timeline"].map(x=>option(x)) }
];

const MODIFIERS = {
  emotional_clarity:{ id:"mod_emotional", title:"What happens in a normal week that makes this feel heavy?", type:"text", privacy:true, help:"Keep it general. Do not include names, personal information, confidential records, credentials, or exact financial details." },
  financial_claim:{ id:"mod_financial", title:"What currently supports the financial impact you have in mind?", options:["A reconciled report","A directional estimate","Experience or intuition","Unsure"].map(x=>option(x)) },
  defensive_culture:{ id:"mod_fair", title:"What would make a new process feel fair and useful to managers?", options:["Agreed definitions","Ability to add context","Consistent thresholds","Manager-selected signals","Clearer authority","Less admin work"].map(x=>option(x)) },
  no_sponsor:{ id:"mod_sponsor", title:"Who would need to believe this deserves attention before change could move?", options:["Owner or founder","Executive team","Operations leader","Finance leader","Another internal sponsor","Unsure"].map(x=>option(x)) },
  immediate_urgency:{ id:"mod_regulated", title:"Is there a safety, legal, payroll, employee-relations, cybersecurity, or other regulated concern involved?", options:[option("yes","Yes or possibly"),option("no","No")] },
  wants_surveillance:{ outputOnly:true },
  wants_automation:{ id:"mod_automation", title:"Which decision or repetitive action should automation improve?", options:["Knowing what deserves attention","Routing a clear next action","Removing repeated data entry","Reconciling approved information","Tracking commitments and outcomes","We have not defined it yet"].map(x=>option(x)) },
  strong_fit:{ outputOnly:true }
};

const TEST_FIXTURES = [
  { name:"Owner \u00b7 systems", answers:{role:"owner",locations:"4\u20136 locations",concepts:"2",pain:"systems",detail:"I spend Sunday nights assembling updates.",consequence:["Peace of mind","Time"],desired:"I would know what deserves my attention",constraint:"Information exists but is scattered",readiness:"Ready to assess and act",sys_count:"7\u201310",sys_hard:"Reconciling it",sys_defs:"Partly",sys_help:"A decision queue",mod_emotional:"Several reports conflict, so I check each number myself."}},
  { name:"COO \u00b7 labor", answers:{role:"ops",locations:"4\u20136 locations",concepts:"1",pain:"labor",detail:"Labor conversations become personal.",consequence:["Team morale","Financial performance"],desired:"Managers would have clearer ownership",constraint:"The process is inconsistent across locations",readiness:"Ready to understand the opportunity first",labor_primary:"Schedule versus demand",labor_when:"After the week",labor_view:"Sometimes",labor_result:"Fairer context"}, forceModifiers:["defensive_culture"] },
  { name:"GM \u00b7 admin", answers:{role:"gm",locations:"1 location",pain:"admin",detail:"Repeated updates pull me off the floor.",consequence:["Guest experience","Personal energy"],desired:"Managers would have more guest and team time",constraint:"The issue competes with too many other priorities",readiness:"Ready to assess and act",admin_time:"6\u201310 hours",admin_burden:"Reports",admin_repeat:"In several reports",admin_return:"Spend time with guests",mod_emotional:"Most days I resend the same update in several formats.",mod_sponsor:"Operations leader"}},
  { name:"Founder \u00b7 strong", answers:{role:"owner",locations:"7\u201310 locations",concepts:"3\u20134",pain:"strong",detail:"We want to scale without losing hospitality.",consequence:["Growth opportunities","Confidence in decisions"],desired:"More opportunities would become visible",constraint:"We do not yet understand the root cause",readiness:"Ready to assess and act",strong_protect:"Team culture",strong_value:"Manager development",strong_effort:"A meeting",strong_hours:"Growth"}},
  { name:"Finance \u00b7 inventory", answers:{role:"finance",locations:"4\u20136 locations",concepts:"2",pain:"inventory",detail:"Recipe and purchase units do not line up.",consequence:["Confidence in decisions","Financial performance"],desired:"Reports would arrive on time and reconcile",constraint:"We do not have reliable information",readiness:"Ready to assess and act",inv_foundation:"Unit conversions",inv_schedule:"Inconsistently",inv_recipe:"Partly",inv_result:"Trustworthy food cost"}},
  { name:"Owner \u00b7 surveillance", answers:{role:"owner",locations:"2\u20133 locations",concepts:"1",pain:"accountability",detail:"I want to secretly track and score employees individually.",consequence:["Time","Team morale"],desired:"Managers would have clearer ownership",constraint:"No one clearly owns the outcome",readiness:"Ready to assess and act",acct_origin:"Texts or chat",acct_complete:"Rarely",acct_open:"No follow-up",acct_experience:"Personal or defensive",mod_fair:"Ability to add context"}}
];

let state = { answers:{}, index:0, sequence:[], forcedModifiers:[] };

function detectModifiers(){
  const a=state.answers, detail=(a.detail||"").toLowerCase(), mods=[];
  if ((a.consequence||[]).some(x=>["Peace of mind","Personal energy"].includes(x)) && !a.detail) mods.push("emotional_clarity");
  if ((a.consequence||[]).includes("Financial performance") && /[$\u20ac\u00a3]|\b\d+(?:[.,]\d+)?\s*(?:%|percent|thousand|million|k|m)\b/i.test(a.detail||"")) mods.push("financial_claim");
  if (a.acct_experience==="Personal or defensive") mods.push("defensive_culture");
  if (["gm","other"].includes(a.role) && a.readiness==="Interested, but need internal alignment") mods.push("no_sponsor");
  if (/urgent|immediate|safety|legal|payroll|employee.relation|cyber|regulated/i.test(detail)) mods.push("immediate_urgency");
  if (/surveil|secretly track|monitor employees|score employees|individual tracking|punitive/i.test(detail)) mods.push("wants_surveillance");
  if (/integrat|automat|api|connect the systems/i.test(detail)) mods.push("wants_automation");
  if (["owner","ceo","ops","director"].includes(a.role) && a.readiness==="Ready to assess and act" && a.pain && a.pain!=="other") mods.push("strong_fit");
  return [...new Set([...(state.forcedModifiers||[]),...mods])];
}

function q(id,title,options,stage=2,type="single",max=1,extra={}){return{id,title,options:(options||[]).map(x=>typeof x==="string"?option(x):x),stage,type,max,...extra}}
function buildSequence(){
  const a=state.answers, seq=[];
  seq.push({...CORE[0]});
  if (a.role==="other") seq.push(q("role_detail","How would you describe your role in a few words?",[],0,"text",1,{privacy:true,help:"Keep it general. Do not include names, contact information, or other personal details."}));
  seq.push({...CORE[1]});
  if (a.locations && a.locations!=="1 location") seq.push(q("concepts","How many distinct concepts or brands?",["1","2","3\u20134","5+"],0));
  seq.push({...CORE[2]});
  seq.push({...CORE[3]});
  if (a.pain && SCENARIOS[a.pain]) SCENARIOS[a.pain].questions.forEach(raw=>seq.push(q(raw[0],raw[1],raw[3],2,raw[4]||"single",raw[5]||1,{help:raw[2]})));
  seq.push({...CORE[5]},{...CORE[4]},{...CORE[6]});
  const remaining=Math.max(0,MAX_QUESTIONS-seq.length);
  const questionMods=detectModifiers().filter(m=>MODIFIERS[m]&&!MODIFIERS[m].outputOnly).slice(0,Math.min(MAX_MODIFIERS,remaining));
  questionMods.forEach(m=>seq.push({...MODIFIERS[m],stage:4,modifier:m}));
  if(seq.length>MAX_QUESTIONS) seq.splice(MAX_QUESTIONS);
  state.sequence=seq;
}

function start(){ state.index=0; buildSequence(); $("#welcome").hidden=true; $("#snapshot").hidden=true; $("#scan").hidden=false; $("#restartTop").hidden=false; render(); }
function clearFrom(index){ const keep=new Set(state.sequence.slice(0,index+1).map(x=>x.id)); Object.keys(state.answers).forEach(k=>{if(!keep.has(k))delete state.answers[k]}); }
function choose(value){
  const item=state.sequence[state.index], previous=JSON.stringify(state.answers[item.id]);
  if(item.type==="multi"){let selected=[...(state.answers[item.id]||[])];selected=selected.includes(value)?selected.filter(x=>x!==value):selected.length<item.max?[...selected,value]:selected;state.answers[item.id]=selected}else state.answers[item.id]=value;
  if(previous!==JSON.stringify(state.answers[item.id])) clearFrom(state.index);
  render();
}
function currentValid(){const item=state.sequence[state.index],v=state.answers[item.id];return item.optional||item.type==="text"||Array.isArray(v)?(item.optional||v.length>0):Boolean(v)}
function next(){
  const item=state.sequence[state.index]; if(!currentValid())return;
  if(item.type==="text"){const value=$("#textAnswer").value.trim();state.answers[item.id]=redact(value)}
  const before=state.sequence.map(x=>x.id).join("|");buildSequence();const after=state.sequence.map(x=>x.id).join("|");
  if(before!==after) clearIncompatible();
  if(state.answers.mod_regulated==="yes"){showSnapshot(true);return}
  if(state.index>=state.sequence.length-1){showSnapshot(false);return}
  state.index++;render();
}
function back(){if(state.index>0){state.index--;render()}else showWelcome()}
function clearIncompatible(){const valid=new Set(state.sequence.map(x=>x.id));Object.keys(state.answers).forEach(k=>{if(!valid.has(k)&&k!=="detail")delete state.answers[k]})}
function showWelcome(){ $("#scan").hidden=true; $("#snapshot").hidden=true; $("#welcome").hidden=false; $("#restartTop").hidden=!Object.keys(state.answers).length; $("#beginButton").textContent=Object.keys(state.answers).length?"Continue the scan \u2192":"Begin the scan \u2192"; $("#welcomeTitle").focus?.(); }

function render(){
  buildSequence();const item=state.sequence[state.index];if(!item){showSnapshot(false);return}
  const stage=item.stage??2;$("#stageKicker").textContent=`Stage ${stage+1} of 5`;$("#stageName").textContent=STAGES[stage];
  $("#stageDots").innerHTML=STAGES.map((s,i)=>`<i class="${i<stage?"done":i===stage?"active":""}" title="${s}"></i>`).join("");
  const rolePrompt=item.id==="consequence"?roleConsequence():item.title;
  let control="";
  if(item.type==="text"){
    const value=escapeHtml(state.answers[item.id]||"");control=`${item.privacy?`<p class="privacy-note"><strong>Privacy note:</strong> ${escapeHtml(item.help)}</p>`:""}<textarea id="textAnswer" class="text-input" maxlength="240" aria-label="${escapeHtml(rolePrompt)}" placeholder="A sentence is plenty\u2026">${value}</textarea><div class="text-count">Up to 240 characters \u00b7 obvious contact details and secrets are redacted</div>`;
  } else {
    const selected=state.answers[item.id]||[];control=`<div class="options" role="${item.type==="multi"?"group":"radiogroup"}" aria-label="Answer choices">${item.options.map(o=>{const is=item.type==="multi"?selected.includes(o.value):selected===o.value;return`<button type="button" class="option ${item.type==="multi"?"multi":""} ${is?"selected":""}" role="${item.type==="multi"?"checkbox":"radio"}" aria-checked="${is}" data-value="${escapeHtml(o.value)}">${escapeHtml(o.label)}</button>`}).join("")}</div>`;
    if(item.id==="pain") control+=`<p class="privacy-note"><strong>Optional context:</strong> In one general sentence, what makes this difficult? Do not include names, employee or guest information, credentials, confidential records, or exact financial details.</p><textarea id="detailAnswer" class="text-input" maxlength="240" aria-label="Optional context about the recurring issue" placeholder="A sentence is plenty\u2026">${escapeHtml(state.answers.detail||"")}</textarea><div class="text-count">Obvious contact details and secrets are redacted before reflection</div>`;
  }
  $("#questionCard").innerHTML=`<span class="question-number">Question ${state.index+1}</span><h3 id="questionTitle" tabindex="-1">${escapeHtml(rolePrompt)}</h3>${item.help&&!item.privacy?`<p class="question-help">${escapeHtml(item.help)}</p>`:""}${control}`;
  document.querySelectorAll(".option").forEach(el=>el.addEventListener("click",()=>choose(el.dataset.value)));
  if(item.type==="text") $("#textAnswer").addEventListener("input",e=>{state.answers[item.id]=e.target.value;updateNext()});
  if(item.id==="pain") $("#detailAnswer").addEventListener("input",e=>{clearFrom(state.index);state.answers.detail=e.target.value});
  $("#questionCount").textContent=`${state.index+1} of ${state.sequence.length} \u00b7 never more than ${MAX_QUESTIONS}`;
  $("#nextButton").innerHTML=state.index===state.sequence.length-1?"See my snapshot <span aria-hidden='true'>\u2192</span>":"Continue <span aria-hidden='true'>\u2192</span>";
  updateNext();$("#questionTitle").focus();
}
function updateNext(){ $("#nextButton").disabled=!currentValid(); }
function roleConsequence(){const r=state.answers.role;if(["owner","ceo"].includes(r))return"What does this take away from you personally?";if(["ops","director"].includes(r))return"What does this prevent you and your managers from doing well?";if(r==="finance")return"What decisions become slower or less reliable because of this?";if(r==="gm")return"What does this take away from your team or guests?";return"What consequence matters most?"}

function redact(text){
  return String(text||"")
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,"[email redacted]")
    .replace(/(?:\+?\d[\s().-]*){7,15}\d/g,"[phone redacted]")
    .replace(/\b(?:sk|pk|api|token|secret|password)[-_]?[A-Za-z0-9_-]{8,}\b/gi,"[secret redacted]")
    .replace(/\b(?:bearer\s+)[A-Za-z0-9._-]{8,}\b/gi,"[token redacted]")
    .slice(0,240);
}
function escapeHtml(value){return String(value??"").replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]))}
function humanList(xs){const a=(xs||[]).map(x=>x.toLowerCase());return a.length>1?`${a[0]} and ${a[1]}`:a[0]||"leadership attention"}
function snapshotData(safety){
  const a=state.answers, scenario=SCENARIOS[a.pain]||SCENARIOS.other, mods=detectModifiers(), surveillance=mods.includes("wants_surveillance");
  const detail=redact(a.detail||a.mod_emotional||"");
  const heard=`You are carrying ${PAINS[a.pain]||PAINS.other}, and it appears to affect ${humanList(a.consequence)}.${detail?` In your words: "${detail}"`:""}`;
  let stuck=`One possibility is ${(a.constraint||"the root constraint is not yet clear").toLowerCase()}. That is a hypothesis\u2014we would need operating context and agreed information before treating it as a conclusion.`;
  let strength=a.pain==="strong"?`You named ${String(a.strong_protect||"an existing strength").toLowerCase()} as something worth protecting.`:"Naming the recurring issue and the change you want is a useful first signal\u2014not proof of maturity, but evidence that the pattern can be examined.";
  let opportunity=scenario.theme, milestone=scenario.milestone;
  if(surveillance){opportunity="Track commitments and operating outcomes, not people. Transparent accountability may fit; hidden individual surveillance does not.";milestone="Reframe the goal around a visible operating commitment, manager context, and proof of completion."}
  const tests=questionIdeas(a.pain,surveillance).slice(0,3);
  let next="Explore the snapshot with no pressure; clarify one question before deciding whether further work is useful.";
  if(safety) next="Pause this scan and route the concern to the appropriate internal leader or qualified legal, HR, payroll, cybersecurity, safety, or other licensed support.";
  else if(surveillance) next="AI Lava is not a fit if individual surveillance remains the goal. If the goal can become transparent, manager-informed accountability, begin with an alignment conversation.";
  else if(mods.includes("no_sponsor")||a.readiness==="Interested, but need internal alignment") next="Hold a sponsor alignment conversation before any assessment or change effort.";
  else if(a.readiness==="Ready to assess and act") next="A 30-minute Opportunity Conversation could test these questions and decide whether a tightly bounded assessment is useful.";
  else if(a.readiness==="Ready to understand the opportunity first") next="Review a one-page outline and a synthetic example before choosing whether to continue.";
  if(mods.includes("financial_claim")){const basis=a.mod_financial||"Unsure";stuck+=` Any financial impact discussed here should be treated as ${basis==="A reconciled report"?"supported by a stated reconciled source, still subject to validation":basis==="A directional estimate"?"directional":"unverified"}.`}
  return{heard,stuck,strength,opportunity,milestone,tests,next,surveillance};
}
function questionIdeas(pain,surveillance){if(surveillance)return["Which operating commitments should be visible to everyone?","What context can managers add before escalation?","What proof shows an outcome is complete?"];return({financial:["Which metric definition can leadership agree on?","Where does reconciliation first break?","Which exception should trigger a named action?"],labor:["Can sales demand and labor expectations be seen together?","What makes an exception legitimate?","Which correction can managers own earlier?"],inventory:["Which foundation breaks first: counts, units, recipes, or invoices?","Can one category reconcile end to end?","Which definition must be trusted before margin conclusions?"],admin:["Which repeated update consumes the most manager time?","Can an approved report answer it already?","What would managers do with the first two hours returned?"],accountability:["Does every action have an owner, deadline, and proof?","Where is manager authority unclear?","Which escalation rule would feel consistent?"],guest:["Which repeat theme deserves cross-location visibility?","Who owns a serious issue in the same shift?","How does a recovery create operational learning?"],sales:["Does every qualified lead have a next action and due date?","Where does the handoff first lose momentum?","Which early signal predicts a stale opportunity?"],systems:["Which definitions conflict across systems?","What five exceptions actually deserve leadership attention?","Who should own the action after each signal?"],strong:["Which strength can scale without becoming brittle?","Which decision depends too heavily on one leader?","Where would five returned hours create new value?"],other:["What observable event defines the pattern?","How often does it occur?","What smallest result would count as learning?"]}[pain]||[])}

function showSnapshot(safety){
  $("#scan").hidden=true;$("#welcome").hidden=true;$("#snapshot").hidden=false;$("#restartTop").hidden=false;const d=snapshotData(safety);
  $("#snapshotIntro").textContent=safety?"The responsible next move is appropriate routing, not a commercial recommendation.":d.surveillance?"A clear boundary can be useful, too.":"Not a diagnosis\u2014just a bounded hypothesis worth examining.";
  const safetyEl=$("#safetyRoute");safetyEl.hidden=!safety;if(safety)safetyEl.innerHTML=`<span class="block-label">Appropriate routing</span><h3>Pause the normal commercial flow.</h3><p>This may involve a regulated, safety, legal, payroll, employee-relations, or cybersecurity concern. AI Lava is not the responsible expert for that issue. Share only the minimum necessary information with the appropriate internal leader or qualified licensed professional. This scan does not provide legal, HR, safety, payroll, or cybersecurity advice.</p>`;
  const blocks=safety?[
    ["01 \u00b7 What we heard","A concern may require specialized or regulated support.",d.heard,"full"],
    ["02 \u00b7 Recommended next step","Route before proceeding",d.next,"full"]
  ]:[
    ["01 \u00b7 What we heard","The pressure in view",d.heard,""],
    ["02 \u00b7 Possible constraint","What may be keeping it stuck",d.stuck,""],
    ["03 \u00b7 Strength","What is already working",d.strength,""],
    ["04 \u00b7 Opportunity","A useful direction",d.opportunity,"opportunity"],
    ["05 \u00b7 Questions worth testing","Stay curious, not certain",`<ul>${d.tests.map(x=>`<li>${escapeHtml(x)}</li>`).join("")}</ul>`,"full",true],
    ["06 \u00b7 Candidate first move","Your smallest milestone",`<span class="candidate">CANDIDATE \u2014 NOT A PROMISE</span><p>${escapeHtml(d.milestone)}</p>`,"",true],
    ["07 \u00b7 Next step","Keep the choice in your hands",d.next,"",false]
  ];
  $("#snapshotBlocks").innerHTML=blocks.map(b=>`<article class="snapshot-block ${b[3]}"><span class="block-label">${b[0]}</span><h3>${b[1]}</h3>${b[4]?b[2]:`<p>${escapeHtml(b[2])}</p>`}</article>`).join("");
  window.scrollTo({top:0,behavior:"smooth"});$("#snapshotTitle").focus();
}
function reset(){state={answers:{},index:0,sequence:[],forcedModifiers:[]};showWelcome()}
function loadFixture(i){const f=TEST_FIXTURES[i];state={answers:JSON.parse(JSON.stringify(f.answers)),index:0,sequence:[],forcedModifiers:f.forceModifiers||[]};buildSequence();showSnapshot(false)}

$("#beginButton").addEventListener("click",start);$("#backButton").addEventListener("click",back);$("#nextButton").addEventListener("click",next);$("#restartButton").addEventListener("click",reset);$("#restartTop").addEventListener("click",reset);
document.addEventListener("keydown",e=>{if($("#scan").hidden)return;if(e.key==="Enter"&&e.target.tagName!=="TEXTAREA"&&!$("#nextButton").disabled)next();if(e.key==="Escape")back()});
const testMode=new URLSearchParams(location.search).get("test")==="1";if(testMode){$("#testBadge").hidden=false;$("#fixturePanel").hidden=false;$("#fixtureButtons").innerHTML=TEST_FIXTURES.map((f,i)=>`<button type="button" data-fixture="${i}">${escapeHtml(f.name)}</button>`).join("");document.querySelectorAll("[data-fixture]").forEach(b=>b.addEventListener("click",()=>loadFixture(Number(b.dataset.fixture))))}

window.AILavaScan={MAX_QUESTIONS,CORE_QUESTION_COUNT,MAX_PRIMARY_BRANCHES,MAX_MODIFIERS,SCENARIOS,MODIFIERS,TEST_FIXTURES,redact,buildSequence};
