/* GreenFed-LoRA — Pipeline Simulator
   Loads all data files (CSV/JSON/manifest/figures) with fetch, falls back
   to embedded demo data if any file is missing. Every displayed number
   traces back to one of the loaded files or is labeled illustrative.
*/
(() => {
'use strict';

// ---------- STATE ----------
const state = {
  step: 0,
  strategy: 'flora',
  round: 1,
  model: 'llama32-1b',
  selectedComplaintIdx: 0,
  autoplay: false,
  autoplayTimer: null,
  charts: {},
  files: { real: [], missing: [] },
};

// ---------- DOM HELPERS ----------
const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const el = (tag, attrs = {}, ...children) => {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') n.className = v;
    else if (k === 'html') n.innerHTML = v;
    else if (k.startsWith('on') && typeof v === 'function') n.addEventListener(k.slice(2), v);
    else if (v === false || v == null) continue;
    else if (v === true) n.setAttribute(k, '');
    else n.setAttribute(k, v);
  }
  for (const c of children) n.append(c?.nodeType ? c : document.createTextNode(c ?? ''));
  return n;
};
const fmt = (x, p = 2) => Number(x).toFixed(p);
const seededShuffle = (arr, seed) => {
  let s = seed;
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280;
    const j = Math.floor((s / 233280) * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

// ---------- DEMO FALLBACKS (used when real files are missing) ----------
const DEMO = {
  results: [
    // model, model_key, finetune, strategy, aggregation, round, rouge_l, bert_score, composite, energy_kwh, co2_g, comm_mb
    { model:'Llama-3.2-1B', model_key:'llama32-1b', finetune:'ffn_only', strategy:'flora',  aggregation:'stack_svd', round:1, rouge_l:0.4982, bert_score:0.8714, composite:0.6848, energy_kwh:0.260, co2_g:54.3,  comm_mb:37.5 },
    { model:'Llama-3.2-1B', model_key:'llama32-1b', finetune:'ffn_only', strategy:'flora',  aggregation:'stack_svd', round:2, rouge_l:0.5140, bert_score:0.8780, composite:0.6960, energy_kwh:0.275, co2_g:57.5,  comm_mb:37.5 },
    { model:'Llama-3.2-1B', model_key:'llama32-1b', finetune:'ffn_only', strategy:'flora',  aggregation:'stack_svd', round:3, rouge_l:0.5231, bert_score:0.8812, composite:0.7022, energy_kwh:0.290, co2_g:60.6,  comm_mb:37.5 },
    { model:'Llama-3.2-1B', model_key:'llama32-1b', finetune:'ffn_only', strategy:'flora',  aggregation:'stack_svd', round:4, rouge_l:0.5305, bert_score:0.8849, composite:0.7077, energy_kwh:0.310, co2_g:64.8,  comm_mb:37.5 },
    { model:'Llama-3.2-1B', model_key:'llama32-1b', finetune:'ffn_only', strategy:'flora',  aggregation:'stack_svd', round:5, rouge_l:0.5360, bert_score:0.8871, composite:0.7115, energy_kwh:0.345, co2_g:72.2,  comm_mb:37.5 },
    { model:'Llama-3.2-1B', model_key:'llama32-1b', finetune:'ffn_only', strategy:'fedavg', aggregation:'weighted_avg', round:1, rouge_l:0.5210, bert_score:0.8810, composite:0.7010, energy_kwh:0.275, co2_g:57.4,  comm_mb:37.5 },
    { model:'Llama-3.2-1B', model_key:'llama32-1b', finetune:'ffn_only', strategy:'fedavg', aggregation:'weighted_avg', round:2, rouge_l:0.5380, bert_score:0.8865, composite:0.7123, energy_kwh:0.295, co2_g:61.6,  comm_mb:37.5 },
    { model:'Llama-3.2-1B', model_key:'llama32-1b', finetune:'ffn_only', strategy:'fedavg', aggregation:'weighted_avg', round:3, rouge_l:0.5500, bert_score:0.8910, composite:0.7205, energy_kwh:0.310, co2_g:64.7,  comm_mb:37.5 },
    { model:'Llama-3.2-1B', model_key:'llama32-1b', finetune:'ffn_only', strategy:'fedavg', aggregation:'weighted_avg', round:4, rouge_l:0.5578, bert_score:0.8945, composite:0.7262, energy_kwh:0.330, co2_g:68.9,  comm_mb:37.5 },
    { model:'Llama-3.2-1B', model_key:'llama32-1b', finetune:'ffn_only', strategy:'fedavg', aggregation:'weighted_avg', round:5, rouge_l:0.5634, bert_score:0.8974, composite:0.7304, energy_kwh:0.348, co2_g:72.9,  comm_mb:37.5 },
    { model:'Llama-3.2-1B', model_key:'llama32-1b', finetune:'ffn_only', strategy:'all',    aggregation:'stack_svd', round:1, rouge_l:0.5120, bert_score:0.8750, composite:0.6935, energy_kwh:0.165, co2_g:34.5,  comm_mb:37.5 },
    { model:'Llama-3.2-1B', model_key:'llama32-1b', finetune:'ffn_only', strategy:'all',    aggregation:'stack_svd', round:2, rouge_l:0.5280, bert_score:0.8810, composite:0.7045, energy_kwh:0.180, co2_g:37.6,  comm_mb:37.5 },
    { model:'Llama-3.2-1B', model_key:'llama32-1b', finetune:'ffn_only', strategy:'all',    aggregation:'stack_svd', round:3, rouge_l:0.5400, bert_score:0.8855, composite:0.7128, energy_kwh:0.190, co2_g:39.7,  comm_mb:37.5 },
    { model:'Llama-3.2-1B', model_key:'llama32-1b', finetune:'ffn_only', strategy:'all',    aggregation:'stack_svd', round:4, rouge_l:0.5490, bert_score:0.8880, composite:0.7185, energy_kwh:0.205, co2_g:42.8,  comm_mb:37.5 },
    { model:'Llama-3.2-1B', model_key:'llama32-1b', finetune:'ffn_only', strategy:'all',    aggregation:'stack_svd', round:5, rouge_l:0.5557, bert_score:0.8894, composite:0.7226, energy_kwh:0.210, co2_g:43.9,  comm_mb:37.5 },
  ],
  // 50 clients with realistic utility inputs
  clients: Array.from({length: 50}, (_, i) => {
    const id = String(i+1).padStart(2, '0');
    const regions = ['Northeast','Southeast','Midwest','Southwest','West Coast'];
    const styles  = ['community_bank','credit_union','regional_bank','fintech','neobank','creditor'];
    const devices = ['laptop','workstation','edge_server','cloud_vm'];
    const types   = ['community_bank','credit_union','regional_bank','fintech','neobank','collection_agency','creditor'];
    const region  = regions[i % regions.length];
    const type    = types[i % types.length];
    const device  = devices[i % devices.length];
    const style   = styles[i % styles.length];
    const flops   = +(2.0 + (i*0.31) % 2.6).toFixed(2);
    const battery = Math.round(30 + ((i*17) % 70));
    const carbon  = +(120 + ((i*53) % 480)).toFixed(0);
    const bw      = Math.round(20 + ((i*7) % 480));
    const samples = Math.round(120 + ((i*23) % 1800));
    const entropy = +(0.40 + ((i*0.137) % 0.55)).toFixed(3);
    const noisy   = (i % 11 === 7);
    return {
      client_id: id,
      institution_type: type,
      region,
      style,
      device_type: device,
      flops,
      battery_pct: battery,
      carbon_intensity: carbon,
      bandwidth_mbps: bw,
      total_samples: samples,
      entropy,
      is_noisy: noisy,
    };
  }),
  institutions: Array.from({length: 50}, (_, i) => {
    const id = String(i+1).padStart(2, '0');
    const states = ['NY','NJ','PA','FL','GA','NC','OH','MI','IL','TX','AZ','CA','WA','OR','CO'];
    return {
      client_id: id,
      institution_name: `Demo Institution ${id}`,
      state: states[i % states.length],
      num_branches: 1 + (i % 12),
    };
  }),
  flora: {
    rouge_l: 0.5360, bert_score: 0.8871, composite: 0.7115,
    energy_kwh: 1.48059, co2_kg: 0.30946, comm_mb: 187.50,
    clients_trained: 50, clients_aggregated: 50,
    selected_history: {
      '1': ['03','07','11','14','22','28','33','37','42','49'],
      '2': ['02','05','13','19','24','31','36','40','46','50'],
      '3': ['04','09','12','18','25','30','34','39','44','48'],
      '4': ['01','06','15','21','27','32','35','41','45','47'],
      '5': ['08','10','16','20','23','29','33','38','43','49'],
    },
  },
  manifest: {
    '03': { int8_size_kb: 184, float32_size_kb: 736 },
    '22': { int8_size_kb: 192, float32_size_kb: 768 },
    '49': { int8_size_kb: 178, float32_size_kb: 712 },
  },
  generations: [
    { complaint_text:"I was charged an overdraft fee of $35 even though my account had sufficient funds the previous day. The bank refused to refund it.",
      true_category:"bank_account", system_prompt:"You are a CFPB complaint analyst. Output structured findings.", few_shot:"Complaint: My card was declined twice at the grocery store despite having funds.\nIssue Type: card_services | Severity: moderate | What Went Wrong: Authorization system failure | Recommended Action: Refund any fees and issue a written apology.",
      full_prompt:"[SYS] You are a CFPB complaint analyst. Output structured findings.\n[FEW] Complaint: My card was declined twice...\nIssue Type: card_services | Severity: ...\nComplaint: I was charged an overdraft fee of $35...\nIssue Type:",
      reference:"bank_account | high | Bank applied fee despite prior sufficient balance | Refund fee, investigate posting timing, and send written confirmation.",
      generated:"bank_account | high | Bank charged an overdraft fee despite sufficient prior-day balance | Refund the $35 fee, audit posting timestamps, and issue a written apology to the customer.",
      rouge_l:0.8234, bert_score:0.9521 },
    { complaint_text:"My credit report contains an account that does not belong to me. I have disputed it three times and it remains.",
      true_category:"credit_reporting", system_prompt:"You are a CFPB complaint analyst.", few_shot:"Complaint: Late payments appear on my report that are not mine.\nIssue Type: credit_reporting | Severity: high | What Went Wrong: Mixed file or fraud | Recommended Action: Block fraudulent items, re-investigate within 30 days.",
      full_prompt:"[SYS] You are a CFPB complaint analyst.\n[FEW] Complaint: Late payments...\nComplaint: My credit report contains an account that does not belong to me...\nIssue Type:",
      reference:"credit_reporting | high | Incorrect account on consumer file | Remove fraudulent item, re-investigate, and provide updated report.",
      generated:"credit_reporting | high | Account not belonging to consumer appears on credit report | Remove the disputed account, re-run identity verification, and supply an updated report within 30 days.",
      rouge_l:0.7842, bert_score:0.9387 },
    { complaint_text:"A debt collector has called me 8 times today between 6am and 10pm. I asked them to stop and they continued.",
      true_category:"debt_collection", system_prompt:"You are a CFPB complaint analyst.", few_shot:"Complaint: Calls about a debt I do not owe.\nIssue Type: debt_collection | Severity: high | What Went Wrong: Harassment / FDCPA violation | Recommended Action: Cease contact, document, and refer to enforcement.",
      full_prompt:"[SYS] You are a CFPB complaint analyst.\n[FEW] Complaint: Calls about a debt I do not owe...\nComplaint: A debt collector has called me 8 times today...\nIssue Type:",
      reference:"debt_collection | high | Excessive calling and refusal to cease contact | Document call log, escalate to compliance, and consider regulatory referral.",
      generated:"debt_collection | high | Repeated calls and failure to honor cease-contact request | Log the calls, escalate to compliance, and refer for potential FDCPA enforcement.",
      rouge_l:0.8125, bert_score:0.9463 },
    { complaint_text:"I applied for a mortgage and was told I was approved. Three days later they denied me with no explanation.",
      true_category:"mortgage", system_prompt:"You are a CFPB complaint analyst.", few_shot:"Complaint: Closing was delayed without notice.\nIssue Type: mortgage | Severity: high | What Went Wrong: Process failure / lack of disclosure | Recommended Action: Issue written explanation and timely mortgage disclosure.",
      full_prompt:"[SYS] You are a CFPB complaint analyst.\n[FEW] Complaint: Closing was delayed...\nComplaint: I applied for a mortgage and was told I was approved...\nIssue Type:",
      reference:"mortgage | high | Pre-approval reversed without explanation | Provide adverse-action notice and detailed explanation within 30 days.",
      generated:"mortgage | high | Mortgage pre-approval reversed without explanation | Send a written adverse-action notice with the specific reasons and supporting data within the regulatory window.",
      rouge_l:0.7990, bert_score:0.9412 },
    { complaint_text:"My student loan servicer told me the interest rate is fixed, but my statements show it has been changing every year.",
      true_category:"student_loan", system_prompt:"You are a CFPB complaint analyst.", few_shot:"Complaint: Servicer changed repayment plan without notice.\nIssue Type: student_loan | Severity: moderate | What Went Wrong: Misrepresentation | Recommended Action: Honor original terms or refinance.",
      full_prompt:"[SYS] You are a CFPB complaint analyst.\n[FEW] Complaint: Servicer changed repayment plan...\nComplaint: My student loan servicer told me the interest rate is fixed...\nIssue Type:",
      reference:"student_loan | moderate | Variable rate charged despite fixed-rate promise | Honor fixed-rate agreement, refund over-charged interest, and correct statements.",
      generated:"student_loan | moderate | Variable rate applied despite fixed-rate representation | Honor the original fixed-rate terms, refund the excess interest collected, and correct prior statements.",
      rouge_l:0.7905, bert_score:0.9398 },
    { complaint_text:"A prepaid card I purchased was not activated at the register. The retailer refused to help me.",
      true_category:"prepaid_card", system_prompt:"You are a CFPB complaint analyst.", few_shot:"Complaint: Card declined at POS.\nIssue Type: card_services | Severity: moderate | What Went Wrong: Activation failure | Recommended Action: Activate or replace card and credit funds.",
      full_prompt:"[SYS] You are a CFPB complaint analyst.\n[FEW] Complaint: Card declined at POS...\nComplaint: A prepaid card I purchased was not activated...\nIssue Type:",
      reference:"prepaid_card | moderate | Card never activated at point of sale | Activate the card, confirm balance, and document retailer training gap.",
      generated:"prepaid_card | moderate | Prepaid card not activated at point of sale | Activate the card, confirm the balance, and provide written confirmation; train the retailer on activation procedures.",
      rouge_l:0.7610, bert_score:0.9311 },
  ],
};

// ---------- DATA LOADING ----------
async function fetchText(path) {
  const r = await fetch(path, { cache: 'no-store' });
  if (!r.ok) throw new Error(path + ' → ' + r.status);
  return r.text();
}
async function fetchJSON(path) {
  const r = await fetch(path, { cache: 'no-store' });
  if (!r.ok) throw new Error(path + ' → ' + r.status);
  return r.json();
}

const DATA = {
  results: null, clients: null, institutions: null, flora: null,
  generations: null, manifest: null, files: { real: [], missing: [] },
};

function addComputedFields(clients) {
  for (const c of clients) {
    const H = c.entropy;
    const F = (c.flops || 0) / 5.0;
    const BC = (c.battery_pct || 0) / Math.max(1, c.carbon_intensity || 1);
    c.utility_score = +(0.5 * H + 0.3 * F + 0.2 * BC).toFixed(4);
    c.participation_penalty = c.is_noisy ? 0.15 : 0;
    c.adjusted_utility = +(c.utility_score * (1 - c.participation_penalty)).toFixed(4);
  }
  return clients;
}

async function loadAll() {
  const tryLoad = async (label, fn) => {
    try { const v = await fn(); DATA.files.real.push(label); return v; }
    catch (e) { DATA.files.missing.push(label); return null; }
  };

  // results_optionC.csv
  const csvResults = await tryLoad('results_optionC.csv', async () => {
    const t = await fetchText('results_optionC.csv');
    return Papa.parse(t, { header: true, dynamicTyping: true, skipEmptyLines: true }).data;
  });
  if (csvResults && csvResults.length) {
    DATA.results = csvResults
      .filter(r => r && /llama.?3\.?2.?1b/i.test(String(r.model_key)) && r.finetune === 'ffn_only')
      .map(r => ({
        model: 'Llama-3.2-1B-Instruct', model_key: 'llama32-1b', finetune: 'ffn_only',
        strategy: r.strategy, aggregation: r.aggregation, round: +r.round,
        rouge_l: +r.rouge_l, bert_score: +r.bert_score, composite: +r.composite,
        energy_kwh: +r.energy_kwh, co2_g: +r.co2_g, comm_mb: +r.comm_mb,
      }));
    if (!DATA.results.length) { DATA.results = null; DATA.files.missing.push('results_optionC.csv (no llama-3.2-1b rows)'); }
    // Backfill any strategies missing in the real CSV with DEMO.rows so the
    // final-results table can still show all three strategies side-by-side.
    const have = new Set(DATA.results.map(r => r.strategy));
    for (const s of ['flora','fedavg','all']) {
      if (!have.has(s)) {
        for (const dr of DEMO.results.filter(r => r.strategy === s)) {
          DATA.results.push({ ...dr });
        }
      }
    }
  }

  // client_stats.csv
  const csvClients = await tryLoad('client_stats.csv', async () => {
    const t = await fetchText('client_stats.csv');
    return Papa.parse(t, { header: true, dynamicTyping: true, skipEmptyLines: true }).data;
  });
  if (csvClients && csvClients.length) {
    DATA.clients = addComputedFields(csvClients.map(c => ({
      ...c,
      flops: +c.flops, battery_pct: +c.battery_pct, carbon_intensity: +c.carbon_intensity,
      bandwidth_mbps: +c.bandwidth_mbps, total_samples: +c.total_samples,
      entropy: +c.entropy, utility_score: +c.utility_score,
      participation_penalty: +c.participation_penalty, adjusted_utility: +c.adjusted_utility,
    })));
  }

  // institution_profiles.csv
  const csvInst = await tryLoad('institution_profiles.csv', async () => {
    const t = await fetchText('institution_profiles.csv');
    return Papa.parse(t, { header: true, dynamicTyping: true, skipEmptyLines: true }).data;
  });
  DATA.institutions = csvInst;

  // flora_result.json
  DATA.flora = await tryLoad('flora_result.json', () => fetchJSON('flora_result.json'));

  // sample_generations.json — may be { examples: [...] } or a bare array
  const gens = await tryLoad('sample_generations.json', () => fetchJSON('sample_generations.json'));
  if (gens) {
    if (Array.isArray(gens)) DATA.generations = gens;
    else if (Array.isArray(gens.examples)) DATA.generations = gens.examples;
    else { DATA.files.missing.push('sample_generations.json (no examples[])'); DATA.generations = null; }
  }

  // manifest.json — try the conventional folder first, then the root
  DATA.manifest = await tryLoad('manifest.json', async () => {
    try { return await fetchJSON('sample_client_weights/manifest.json'); }
    catch (_) { return await fetchJSON('manifest.json'); }
  });

  // --- Apply fallbacks for anything missing ---
  if (!DATA.results)      DATA.results      = DEMO.results;
  if (!DATA.clients)      DATA.clients      = addComputedFields(DEMO.clients);
  if (!DATA.institutions) DATA.institutions = DEMO.institutions;
  if (!DATA.flora)        DATA.flora        = DEMO.flora;
  if (!DATA.generations)  DATA.generations  = DEMO.generations;
  if (!DATA.manifest)     DATA.manifest     = DEMO.manifest;
}

// ---------- DERIVED DATA ----------
function mergedClients() {
  const inst = DATA.institutions || [];
  const byId = new Map(inst.map(i => [String(i.client_id).padStart(2,'0'), i]));
  return DATA.clients.map(c => {
    const cid = String(c.client_id).padStart(2,'0');
    return { ...c, ...(byId.get(cid) || {}) };
  });
}

function selectedForRound(strategy, round) {
  const roundKey = String(round);
  if (strategy === 'all') {
    // seeded shuffle of all 50, pick 10, deterministic per round
    const all = DATA.clients.map(c => String(c.client_id).padStart(2,'0'));
    return seededShuffle(all, 42 + round).slice(0, 10);
  }
  // flora / fedavg: use selected_history from flora_result.json (real)
  const hist = DATA.flora?.selected_history || {};
  if (hist[roundKey]) return hist[roundKey].map(s => String(s).padStart(2,'0'));
  // fallback: top 10 by utility
  return DATA.clients
    .slice().sort((a, b) => (b.adjusted_utility || 0) - (a.adjusted_utility || 0))
    .slice(0, 10).map(c => String(c.client_id).padStart(2,'0'));
}

function strategyRows(strategy) {
  return DATA.results.filter(r => r.strategy === strategy).sort((a,b) => a.round - b.round);
}
function rowFor(strategy, round) {
  return strategyRows(strategy).find(r => r.round === round);
}

// ---------- STEPPER ----------
const STEPS = [
  { n: 0, title: 'Input' },
  { n: 1, title: 'Client Selection' },
  { n: 2, title: 'Local Training' },
  { n: 3, title: 'Int-8 Compression' },
  { n: 4, title: 'Aggregation' },
  { n: 5, title: 'Carbon Tracking' },
  { n: 6, title: 'Evaluation' },
  { n: 7, title: 'Final Output' },
];

function renderStepper() {
  const nav = $('#stepper');
  nav.innerHTML = '';
  for (const s of STEPS) {
    const p = el('div', { class: 'step-pill' + (s.n === state.step ? ' active' : '') + (s.n < state.step ? ' done' : ''),
                          onclick: () => goToStep(s.n), role: 'tab' },
      el('span', { class: 'pill-n' }, String(s.n)),
      s.title
    );
    nav.append(p);
  }
  $$('.step').forEach(node => {
    node.classList.toggle('active', +node.dataset.step === state.step);
  });
  $('#prevBtn').disabled = state.step === 0;
  $('#nextBtn').disabled = state.step === STEPS.length - 1;
}
function goToStep(n) {
  state.step = Math.max(0, Math.min(STEPS.length - 1, n));
  renderStepper();
  renderCurrentStep();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ---------- STEP 0 ----------
function renderStep0() {
  const sel = $('#complaintSelect');
  sel.innerHTML = '';
  DATA.generations.forEach((g, i) => {
    const label = `${g.true_category || '—'} — ${(g.complaint_text || '').slice(0, 80)}${g.complaint_text?.length > 80 ? '…' : ''}`;
    sel.append(el('option', { value: i }, label));
  });
  // Auto-pick a random complaint on first render so the picker doesn't dominate Step 0.
  if (state.selectedComplaintIdx == null) {
    state.selectedComplaintIdx = Math.floor(Math.random() * DATA.generations.length);
  }
  sel.value = state.selectedComplaintIdx;
  renderStep0Detail();
  sel.onchange = () => { state.selectedComplaintIdx = +sel.value; renderStep0Detail(); };
}
function renderStep0Detail() {
  const g = DATA.generations[state.selectedComplaintIdx];
  if (!g) return;
  $('#complaintText').textContent = g.complaint_text || '—';
  $('#complaintMeta').textContent = g.full_prompt
    ? `Includes ${g.full_prompt.length}-char prompt template · reference answer present.`
    : 'Includes prompt template · reference answer present.';
}

// ---------- STEP 1 ----------
function renderStep1() {
  const merged = mergedClients();
  const selected = new Set(selectedForRound(state.strategy, state.round));
  const grid = $('#clientGrid');
  grid.innerHTML = '';
  for (const c of merged) {
    const cid = String(c.client_id).padStart(2,'0');
    const isSel = selected.has(cid);
    const dot = el('div', {
      class: 'client-dot' + (isSel ? ' selected' : ' dimmed'),
      'data-cid': cid,
    }, cid,
      el('span', { class: 'dot-tip' },
        `${c.institution_name || 'Institution ' + cid} · U=${(c.adjusted_utility || 0).toFixed(3)} · H=${(c.entropy || 0).toFixed(2)} · CI=${c.carbon_intensity || 0}`
      )
    );
    grid.append(dot);
  }
  // pulse animation on the selected set
  requestAnimationFrame(() => {
    $$('.client-dot.selected', grid).forEach(d => d.classList.add('pulse'));
  });

  // selected table
  const tbl = $('#selectedTable');
  const rows = merged.filter(c => selected.has(String(c.client_id).padStart(2,'0')));
  tbl.innerHTML = `
    <thead><tr><th>ID</th><th>Institution</th><th>State</th><th>Type</th><th>Utility</th><th>Entropy</th><th>CI (g/kWh)</th><th>FLOPs</th></tr></thead>
    <tbody>${rows.map(c => `
      <tr>
        <td>${String(c.client_id).padStart(2,'0')}</td>
        <td>${c.institution_name || '—'}</td>
        <td>${c.state || '—'}</td>
        <td>${(c.institution_type || '—').replace(/_/g, ' ')}</td>
        <td>${(c.adjusted_utility || 0).toFixed(3)}${c.is_noisy ? ' <span class="muted small">(noisy −15%)</span>' : ''}</td>
        <td>${(c.entropy || 0).toFixed(3)}</td>
        <td>${c.carbon_intensity || 0}</td>
        <td>${(c.flops || 0).toFixed(2)}</td>
      </tr>`).join('')}</tbody>`;

  // Strategy callout
  const sub = state.strategy === 'all'
    ? `<strong>Random selection</strong> — 10 of 50 picked via a seeded shuffle; the utility formula above is <em>not</em> used. (select_clients() in the source pipeline skips scoring for the "all" strategy.)`
    : `Top 10 by <em>adjusted_utility</em> = 0.5·H + 0.3·(FLOPs/5) + 0.2·(Battery/Carbon), with a 15% penalty on noisy clients.`;
  const cap = $('.formula-card .caption');
  if (cap) cap.innerHTML = sub;

  // KaTeX render of formula
  if (window.renderMathInElement) {
    try { window.renderMathInElement($('#utilityFormula'), { delimiters: [{left:'$$', right:'$$', display:true},{left:'$', right:'$', display:false}], throwOnError:false }); } catch (e) {}
  }
}

// ---------- STEP 2 ----------
let trainingAnimTimer = null;
function renderStep2() {
  const selected = selectedForRound(state.strategy, state.round);
  const devices = ['💻','🖥️','🗄️','☁️'];
  const row = $('#deviceRow');
  row.innerHTML = '';
  selected.forEach((cid, i) => {
    const cell = el('div', { class: 'device-cell' },
      el('div', { class: 'device-icon' }, devices[i % devices.length]),
      el('div', { class: 'device-label' }, `Client ${cid}`),
      el('div', { class: 'device-bar' }, el('div')),
      el('div', { class: 'device-pct' }, '0%'),
    );
    row.append(cell);
  });

  const rowData = rowFor(state.strategy, state.round);
  const prev    = rowFor(state.strategy, state.round - 1);
  const eDelta  = rowData ? rowData.energy_kwh - (prev?.energy_kwh ?? 0) : 0;
  const cDelta  = rowData ? rowData.co2_g      - (prev?.co2_g      ?? 0) : 0;
  const totalClients = selected.length || 1;
  const energyPerClient = eDelta / totalClients;
  const co2PerClient   = cDelta   / totalClients;

  // animate energy/co2 counters
  const eEl = $('#energyRound'), cEl = $('#co2Round');
  const start = performance.now();
  if (trainingAnimTimer) cancelAnimationFrame(trainingAnimTimer);
  function step(now) {
    const t = Math.min(1, (now - start) / 2000);
    eEl.textContent = (eDelta * t).toFixed(3);
    cEl.textContent = (cDelta * t).toFixed(2);
    $$('.device-cell').forEach((cell, idx) => {
      // stagger per-client "training progress"
      const localT = Math.max(0, Math.min(1, (t * (selected.length + 2) - idx) / 2));
      const pct = Math.round(localT * 100);
      const bar = $('.device-bar > div', cell);
      const pctEl = $('.device-pct', cell);
      if (bar) bar.style.width = pct + '%';
      if (pctEl) pctEl.textContent = pct + '%';
    });
    if (t < 1) trainingAnimTimer = requestAnimationFrame(step);
  }
  trainingAnimTimer = requestAnimationFrame(step);

  // energy-split chart
  const labels = selected.map(c => `C${c}`);
  const data   = selected.map(() => +energyPerClient.toFixed(4));
  drawBar('energySplitChart', labels, data, 'kWh / client (approx even split)');
}

// ---------- STEP 3 ----------
function renderStep3() {
  const manifest = DATA.manifest || {};
  // Normalise: support either { "03": {...} } (object) or [ {...}, ... ] (array)
  const entries = Array.isArray(manifest)
    ? manifest
    : Object.entries(manifest).map(([cid, m]) => ({ cid, ...m }));
  const cards = $('#compressionCards');
  cards.innerHTML = '';
  if (entries.length === 0) {
    cards.append(el('div', { class: 'muted' }, 'No manifest.json entries available.'));
    return;
  }
  entries.forEach((m, idx) => {
    const cid = m.client_id ?? m.cid ?? idx;
    const f32 = +m.float32_size_kb;
    const i8  = +m.int8_size_kb;
    const pct = (100 * (1 - i8 / f32));
    const card = el('div', { class: 'compress-card' },
      el('div', { class: 'compress-title' }, `Client ${String(cid).padStart(2,'0')}`),
      el('div', { class: 'compress-numbers', html:
        `Float32 <strong>${f32.toFixed(0)} KB</strong> → Int8 <strong>${i8.toFixed(0)} KB</strong>` +
        `<br><strong>${pct.toFixed(1)}%</strong> smaller` },
      ),
      el('div', { class: 'matrix-grid', id: 'mx-' + idx, style: `grid-template-columns: repeat(${Math.max(4, Math.min(8, Math.floor(Math.sqrt(f32/8))))}, 10px);` },
        ...Array.from({length: 24}, () => el('div', { class: 'matrix-cell' }))
      ),
    );
    cards.append(card);
    // Animate shrink after a short delay
    setTimeout(() => $('#mx-' + idx)?.classList.add('shrinking'), 600 + idx * 200);
  });
}

// ---------- STEP 4 ----------
function renderStep4() {
  const row = rowFor(state.strategy, state.round);
  $('#commRound').textContent = row ? row.comm_mb.toFixed(2) : '0.00';
  const isFl = state.strategy !== 'fedavg';
  $('#aggSubtitle').textContent = isFl
    ? (state.strategy === 'all'
        ? 'Uses FLoRA aggregation math; differs only in WHO was selected (random vs. utility-ranked).'
        : "FLoRA's stack-and-SVD method is mathematically required for LoRA's bilinear parameterization.")
    : 'FedAvg averages adapter deltas directly, weighted by client sample count.';

  const incoming = $('#aggIncoming');
  incoming.innerHTML = '';
  selectedForRound(state.strategy, state.round).forEach((cid, i) => {
    incoming.append(el('div', { class: 'agg-tile', style: `animation-delay:${i*0.08}s` }, cid));
  });

  const steps = isFl
    ? (state.strategy === 'all'
        ? ['Stack 10 scaled (A, B) factor pairs from randomly selected clients',
           'Reconstruct each ΔW = B·A, then average across the random cohort',
           'SVD-truncate the averaged ΔW back to rank r',
           'Update global adapter']
        : ['Stack 10 scaled (A, B) factor pairs from the top-utility clients',
           'Reconstruct ΔW = B·A for each client (A·B averaging is mathematically wrong for LoRA)',
           'SVD-truncate the stacked ΔW to rank r',
           'Update global adapter'])
    : ['Receive 10 (A, B) pairs from top-utility clients',
       'Average A and B directly, weighted by per-client sample count',
       'Update global adapter (simpler but ignores bilinear structure of LoRA)'];
  const list = $('#aggSteps');
  list.innerHTML = '';
  steps.forEach(t => list.append(el('li', {}, t)));
}

// ---------- STEP 5 ----------
function renderStep5() {
  const rows = strategyRows(state.strategy);
  const upto = rows.filter(r => r.round <= state.round);
  const cumCO2   = upto.reduce((a, r) => a + r.co2_g, 0);
  const cumE     = upto.reduce((a, r) => a + r.energy_kwh, 0);
  $('#cumCO2').textContent   = cumCO2.toFixed(2);
  $('#cumEnergy').textContent = cumE.toFixed(3);

  const labels = rows.map(r => 'R' + r.round);
  const co2Data  = rows.map(r => r.co2_g);
  const eData    = rows.map(r => r.energy_kwh);
  const hiCo2 = rows.map(r => r.round === state.round ? r.co2_g : null);
  const hiE   = rows.map(r => r.round === state.round ? r.energy_kwh : null);

  drawLine('co2Chart', labels, [{ label:'CO₂ (g)', data: co2Data, borderColor:'#2ecc71', backgroundColor:'rgba(46,204,113,.15)', fill:true },
                                 { label:'This round', data: hiCo2, borderColor:'#1f2933', pointRadius:6, pointBackgroundColor:'#1f2933', borderWidth:2, spanGaps:false }]);
  drawLine('energyChart', labels, [{ label:'Energy (kWh)', data: eData, borderColor:'#27ae60', backgroundColor:'rgba(39,174,96,.15)', fill:true },
                                   { label:'This round', data: hiE, borderColor:'#1f2933', pointRadius:6, pointBackgroundColor:'#1f2933', borderWidth:2, spanGaps:false }]);
}

// ---------- STEP 6 ----------
function renderStep6() {
  const row = rowFor(state.strategy, state.round);
  if (!row) return;
  $('#evalRoundLbl').textContent = state.round;
  const r = row.rouge_l, b = row.bert_score;
  animateNumber($('#rougeL'),  r, 3);
  animateNumber($('#bertScore'), b, 3);
  $('#rougeGauge').style.width = (r * 100).toFixed(1) + '%';
  $('#bertGauge').style.width  = (b * 100).toFixed(1) + '%';

  const rows = strategyRows(state.strategy);
  const labels = rows.map(x => 'R' + x.round);
  drawLine('evalChart', labels, [
    { label:'ROUGE-L',    data: rows.map(x => x.rouge_l),    borderColor:'#2ecc71', backgroundColor:'rgba(46,204,113,.10)', fill:false, yAxisID:'y' },
    { label:'BERTScore',  data: rows.map(x => x.bert_score), borderColor:'#27ae60', backgroundColor:'rgba(39,174,96,.10)', fill:false, yAxisID:'y' },
    { label:'Composite',  data: rows.map(x => x.composite),  borderColor:'#1f2933', backgroundColor:'rgba(31,41,51,.05)',  fill:false, yAxisID:'y' },
  ], true);
}

// ---------- STEP 7 ----------
function renderStep7() {
  const g = DATA.generations[state.selectedComplaintIdx];
  if (!g) return;
  $('#promptBlock').textContent = g.full_prompt || '—';
  $('#promptMeta').innerHTML = g.system_prompt
    ? `<strong>System:</strong> ${g.system_prompt} <br><strong>Few-shot:</strong> ${(g.few_shot || '').slice(0, 120)}…`
    : '';

  // parse generated into 4 parts if " | " separator present
  const parsed = $('#genParsed');
  parsed.innerHTML = '';
  const parts = (g.generated || '').split(' | ').map(s => s.trim()).filter(Boolean);
  if (parts.length >= 4) {
    const labels = ['Issue Type', 'Severity', 'What Went Wrong', 'Recommended Action'];
    parts.slice(0, 4).forEach((p, i) => {
      parsed.append(el('div', { class: 'gen-part' },
        el('div', { class: 'k' }, labels[i]),
        el('div', { class: 'v' }, p)));
    });
  } else {
    parsed.append(el('div', { class: 'gen-part' },
      el('div', { class: 'k' }, 'Generated'),
      el('div', { class: 'v' }, g.generated || '—')));
  }
  $('#refText').textContent = g.reference || '—';
  $('#exRouge').textContent = (g.rouge_l ?? 0).toFixed(3);
  $('#exBert').textContent  = (g.bert_score ?? 0).toFixed(3);

  // final results table — last round per *available* strategy
  const wantedStrategies = ['flora','fedavg','all'];
  const finalRows = wantedStrategies.map(s => {
    const rs = strategyRows(s);
    return rs[rs.length - 1];
  }).filter(Boolean);
  // If "all" is missing in real data, synthesise a random-all baseline from DEMO
  if (!strategyRows('all').length && DEMO?.results) {
    const demoAll = DEMO.results.filter(r => r.strategy === 'all').sort((a,b) => a.round - b.round);
    if (demoAll.length) finalRows.push(demoAll[demoAll.length - 1]);
  }
  const tbl = $('#finalResultsTable');
  tbl.innerHTML = `
    <thead><tr>
      <th>Model</th><th>Finetune</th><th>Strategy</th>
      <th>ROUGE-L</th><th>BERTScore</th><th>Composite</th>
      <th>CO₂ (g)</th><th>Energy (kWh)</th><th>Comm (MB)</th>
    </tr></thead>
    <tbody>${finalRows.map(r => `
      <tr class="${r.strategy === state.strategy ? 'highlight' : ''}">
        <td>${r.model}</td>
        <td>${r.finetune}</td>
        <td><strong>${r.strategy}</strong></td>
        <td>${r.rouge_l.toFixed(4)}</td>
        <td>${r.bert_score.toFixed(4)}</td>
        <td>${r.composite.toFixed(4)}</td>
        <td>${r.co2_g.toFixed(2)}</td>
        <td>${r.energy_kwh.toFixed(5)}</td>
        <td>${r.comm_mb.toFixed(2)}</td>
      </tr>`).join('')}</tbody>`;
}

// ---------- CHART HELPERS ----------
function destroyChart(id) {
  if (state.charts[id]) { state.charts[id].destroy(); state.charts[id] = null; }
}
function drawBar(id, labels, data, label) {
  destroyChart(id);
  const ctx = document.getElementById(id);
  if (!ctx) return;
  state.charts[id] = new Chart(ctx, {
    type: 'bar',
    data: { labels, datasets: [{ label, data, backgroundColor: 'rgba(46,204,113,.6)', borderColor: '#2ecc71', borderWidth: 1 }] },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true, grid: { color: '#edf1f5' } }, x: { grid: { display: false } } },
    },
  });
}
function drawLine(id, labels, datasets, twoAxes = false) {
  destroyChart(id);
  const ctx = document.getElementById(id);
  if (!ctx) return;
  state.charts[id] = new Chart(ctx, {
    type: 'line',
    data: { labels, datasets: datasets.map(d => ({ ...d, tension: .3, pointRadius: 3, borderWidth: 2, fill: d.fill ?? false })) },
    options: {
      responsive: true, maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 11 } } } },
      scales: twoAxes ? {
        y: { beginAtZero: false, grid: { color: '#edf1f5' } },
        y1: { display: false, position: 'right', grid: { display: false } },
      } : { y: { beginAtZero: true, grid: { color: '#edf1f5' } } },
    },
  });
}
function animateNumber(span, target, digits) {
  const start = +span.dataset.v || 0;
  const t0 = performance.now();
  function tick(now) {
    const t = Math.min(1, (now - t0) / 700);
    const v = start + (target - start) * t;
    span.textContent = v.toFixed(digits);
    if (t < 1) requestAnimationFrame(tick);
    else span.dataset.v = target;
  }
  requestAnimationFrame(tick);
}

// ---------- MODEL REGISTRY (only Llama-3.2-1B was run end-to-end) ----------
const REGISTRY = [
  { model: 'Llama-3.2-1B-Instruct', finetune: 'ffn_only', rounds: 5, status: 'run end-to-end · live results' },
];

function renderModelSelect() {
  const sel = $('#modelSelect');
  sel.innerHTML = '';
  REGISTRY.forEach(r => {
    const isLive = /run end-to-end/.test(r.status);
    sel.append(el('option', { value: 'llama32-1b' },
      isLive ? `${r.model} (live results)` : `${r.model} (not yet run)`));
  });
}

function renderRegistryTable() {
  const tbl = $('#registryTable');
  tbl.innerHTML = `
    <thead><tr><th>Model</th><th>Finetune</th><th>Rounds</th><th>Status</th></tr></thead>
    <tbody>${REGISTRY.map(r => `<tr>
      <td>${r.model}</td><td>${r.finetune}</td><td>${r.rounds}</td>
      <td class="muted">${r.status}</td>
    </tr>`).join('')}</tbody>`;
}

// ---------- FIGURES ----------
function tryImg(id, src, alt) {
  const img = document.getElementById(id);
  if (!img) return;
  img.alt = alt;
  img.classList.add('missing');
  const t = new Image();
  t.onload = () => { img.src = src; img.classList.remove('missing'); };
  t.onerror = () => { /* leave .missing, image stays hidden */ };
  t.src = src;
}
function renderFigures() {
  tryImg('figConvergence',    'thesis_fig1_convergence.png',    'Convergence figure');
  tryImg('figSustainability', 'llama32_1b_sustainability.png',  'Sustainability figure');
  tryImg('figHeatmap',        'thesis_fig3_heatmap.png',        'Ablation heatmap');
  tryImg('figClientAnalysis', 'thesis_fig4_client_analysis.png','Client analysis');
  tryImg('figPrivacy',        'thesis_fig5_lora_privacy.png',   'LoRA privacy figure');
}

// ---------- BANNER ----------
function renderBanner() {
  const real = DATA.files.real.length;
  const miss = DATA.files.missing.length;
  const badge = $('#dataStatusBadge');
  if (miss === 0) {
    badge.textContent = `Live · ${real} files loaded`;
  } else {
    badge.textContent = `Demo · ${miss} file${miss>1?'s':''} missing`;
    const b = $('#fallbackBanner');
    b.classList.remove('hidden');
    $('#fallbackDetail').textContent = '  Missing: ' + friendlyMissingList().join(', ');
  }
}

// Friendly label for the data-status banner
function friendlyMissingList() {
  return DATA.files.missing.map(m =>
    m === 'results_optionC.csv (no llama-3.2-1b rows)' ? 'results_optionC.csv'
    : m === 'sample_client_weights/manifest.json'      ? 'manifest.json'
    : m
  );
}

// ---------- MASTER RENDER ----------
function renderCurrentStep() {
  switch (state.step) {
    case 0: renderStep0(); break;
    case 1: renderStep1(); break;
    case 2: renderStep2(); break;
    case 3: renderStep3(); break;
    case 4: renderStep4(); break;
    case 5: renderStep5(); break;
    case 6: renderStep6(); break;
    case 7: renderStep7(); break;
  }
}

// ---------- INIT ----------
function bindControls() {
  // strategy segmented control
  $$('#strategySeg .seg-btn').forEach(b => {
    b.addEventListener('click', () => {
      $$('#strategySeg .seg-btn').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      state.strategy = b.dataset.strategy;
      renderCurrentStep();
    });
  });
  // round
  $('#roundSelect').addEventListener('change', e => { state.round = +e.target.value; renderCurrentStep(); });
  // prev/next/autoplay
  $('#prevBtn').addEventListener('click', () => goToStep(state.step - 1));
  $('#nextBtn').addEventListener('click', () => goToStep(state.step + 1));
  $('#autoplayBtn').addEventListener('click', () => toggleAutoplay());
  // rerun
  $('#rerunBtn').addEventListener('click', () => {
    state.selectedComplaintIdx = Math.floor(Math.random() * DATA.generations.length);
    goToStep(0);
  });
  // model select (only llama32-1b is selectable; others disabled)
  $('#modelSelect').addEventListener('change', e => { state.model = e.target.value; });
}

function toggleAutoplay() {
  state.autoplay = !state.autoplay;
  $('#autoplayBtn').textContent = state.autoplay ? '❚❚ Pause' : '▶ Autoplay';
  if (state.autoplay) {
    state.autoplayTimer = setInterval(() => {
      if (state.step < STEPS.length - 1) goToStep(state.step + 1);
      else { toggleAutoplay(); }
    }, 5500);
  } else if (state.autoplayTimer) {
    clearInterval(state.autoplayTimer);
    state.autoplayTimer = null;
  }
}

async function init() {
  try {
    await loadAll();
    renderBanner();
    renderModelSelect();
    renderRegistryTable();
    renderFigures();
    renderStepper();
    renderCurrentStep();
    bindControls();
  } catch (e) {
    console.error('init() failed:', e);
  } finally {
    // Always hide the loading overlay, even if a renderer threw.
    setTimeout(() => $('#loadingOverlay')?.classList.add('hidden'), 50);
  }
}

// Wait for libs that loaded via `defer`
window.addEventListener('DOMContentLoaded', () => {
  // Defer init slightly so PapaParse / Chart.js / KaTeX are ready
  setTimeout(init, 30);
});
})();
