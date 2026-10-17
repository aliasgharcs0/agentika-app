// Apprentice · live board (dashboard)
// n8n Code node · Mode: "Run Once for All Items" · Language: JavaScript
//
// Inputs: Webhook "Board page" (GET /webhook/board?view=all|manager|sent|declined) and three Data Table
// "Get" nodes (Return All, Always Output Data ON) named exactly: Get requests · Get tasks · Get rules.
// Output: one item { html } → Respond to Webhook (Text, body {{ $json.html }}, Content-Type text/html).
//
// n8n 2.x serves webhook HTML in a sandbox (no cookies, separate origin), so this page needs no
// client-side JavaScript: everything is rendered here, tabs are links, and a meta tag refreshes it.

const BASE = 'https://agentika-app.alternatefutures.ai';
const FORM_URL = `${BASE}/form/request`;
const BOARD_URL = `${BASE}/webhook/board`;
const INBOX_URL = `${BASE}/webhook/inbox`;
const REFRESH_SECONDS = 15;
const TZ = 'Asia/Karachi';
const TEAMS = ['Sales', 'Design', 'Engineering', 'AI & Data', 'Marketing', 'Finance & Legal'];

const read = (node) => { try { return $(node).all().map((i) => i.json); } catch (e) { return []; } };
let view = 'all';
try { view = String(($('Board page').first().json.query || {}).view || 'all'); } catch (e) { /* preview */ }
const requests = read('Get requests').filter((r) => r.request_id)
  .sort((a, b) => new Date(b.received_at) - new Date(a.received_at));
const tasks = read('Get tasks').filter((t) => t.request_id);
const rules = read('Get rules').filter((r) => r.rule && String(r.active) !== 'false')
  .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = (d, opts) => { try { return new Intl.DateTimeFormat('en-GB', { timeZone: TZ, ...opts }).format(d); } catch (e) { return d.toISOString().slice(11, 16); } };
const clock = (d) => fmt(d, { hour: '2-digit', minute: '2-digit', hour12: false });
const when = (iso) => {
  const d = new Date(iso);
  if (isNaN(d)) return '';
  const day = (x) => fmt(x, { day: 'numeric', month: 'short' });
  return day(d) === day(new Date()) ? clock(d) : `${day(d)}, ${clock(d)}`;
};
const firstName = (n) => String(n || '').trim().split(/\s+/)[0] || 'Someone';
const TYPE_TITLES = {
  'A new project': 'New project', 'Support for existing work': 'Support request', 'Something else': 'Request',
  'New project / lead': 'New project', 'Support': 'Support request', 'Other': 'Request', 'Internal task': 'Internal task',
};
const titleOf = (r) => r.title || TYPE_TITLES[r.request_type] || 'Request';
const pct = (a, b) => (b ? `${Math.round((100 * a) / b)}%` : '–');

function statusOf(r) {
  switch (r.status) {
    case 'assigned': return r.lane === 'auto' ? ['Sent automatically', 'ok'] : ['Approved and sent', 'ok'];
    case 'approved': return ['Approved, sending', 'ok'];
    case 'awaiting_review': return ['With a manager', 'wait'];
    case 'needs_info': return ['Needs more detail', 'wait-line'];
    case 'suspicious': return ['Flagged as suspicious', 'flag'];
    case 'out_of_scope': return ['Not work we do', 'muted-line'];
    case 'rejected': return ['Declined', 'muted'];
    case 'expired': return ['No decision in time', 'muted-line'];
    case 'error': return ['Needs attention', 'flag'];
    case 'verified': return ['Planning', 'neutral'];
    default: return ['Checking', 'neutral'];
  }
}
function routeOf(r) {
  const ai = r.ai_department;
  const fin = r.final_department;
  const who = esc(r.reviewer || 'a manager');
  if (r.status === 'rejected') return ai || fin ? `<span class="dim">${esc(ai || fin)}</span><span class="by">declined by ${who}</span>` : `<span class="dim">Declined by ${who}</span>`;
  if (!ai && !fin) {
    if (['needs_info', 'suspicious', 'out_of_scope', 'awaiting_review'].includes(r.status)) return '<span class="dim">Waiting for a manager</span>';
    return r.status === 'expired' ? '<span class="dim">No decision was made</span>' : '<span class="dim">Not routed yet</span>';
  }
  if (r.status === 'awaiting_review') return `${esc(ai)}<span class="by">proposed, waiting for a manager</span>`;
  if (fin && ai && fin !== ai) return `<s title="Apprentice's choice">${esc(ai)}</s><span class="arrow" aria-hidden="true">→</span><b>${esc(fin)}</b><span class="by">corrected by ${who}</span>`;
  if (r.lane === 'auto') return `<b>${esc(fin || ai)}</b><span class="by">assigned automatically</span>`;
  if (r.status === 'assigned') return `<b>${esc(fin || ai)}</b><span class="by">approved by ${who}</span>`;
  return `${esc(ai || fin)}<span class="by">proposed</span>`;
}

// ---- numbers ---------------------------------------------------------------------------------
const is = (r, ...s) => s.includes(r.status);
const total = requests.length;
const checked = requests.filter((r) => r.verification || !is(r, 'received')).length;
const waiting = requests.filter((r) => is(r, 'awaiting_review')).length;
const sent = requests.filter((r) => is(r, 'assigned', 'approved'));
const declined = requests.filter((r) => is(r, 'rejected', 'expired')).length;
const auto = sent.filter((r) => r.lane === 'auto').length;
const decided = requests.filter((r) => r.reviewer && !is(r, 'awaiting_review')).length;
const reviewedSent = sent.filter((r) => r.lane === 'review');
const asProposed = reviewedSent.filter((r) => !r.final_department || r.final_department === r.ai_department).length;

const VIEWS = {
  all: ['All', () => true],
  manager: ['With a manager', (r) => is(r, 'awaiting_review', 'needs_info', 'suspicious', 'out_of_scope')],
  sent: ['Sent', (r) => is(r, 'assigned', 'approved')],
  declined: ['Declined', (r) => is(r, 'rejected', 'expired')],
};
if (!VIEWS[view]) view = 'all';
const shown = requests.filter(VIEWS[view][1]);

const perTeam = {};
for (const t of tasks) perTeam[t.department] = (perTeam[t.department] || 0) + 1;
const teamNames = [...TEAMS, ...Object.keys(perTeam).filter((d) => !TEAMS.includes(d))];
const maxTeam = Math.max(1, ...Object.values(perTeam));

// ---- markup --------------------------------------------------------------------------------
const MARK = '<svg class="mark" viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="9" fill="#000AFF"/><path d="M9.5 23.5 16 8.5l6.5 15" fill="none" stroke="#FFFFFF" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M11.6 18.2h8.8" stroke="#FFC7AA" stroke-width="2.6" stroke-linecap="round"/></svg>';
const FAVICON = 'data:image/svg+xml,' + encodeURIComponent(MARK.replace('class="mark" ', 'xmlns="http://www.w3.org/2000/svg" '));

const stage = (n, label, value, note, cls = '') => `<li class="stage ${cls}"><span class="s-n">${n}</span><span class="s-v">${value}</span><span class="s-l">${label}</span><span class="s-note">${note}</span></li>`;
const kpi = (label, value, note, cls = '') => `<div class="kpi ${cls}"><div class="k-l">${label}</div><div class="k-v">${value}</div><div class="k-note">${note}</div></div>`;

const tabs = Object.entries(VIEWS).map(([key, [label, test]]) =>
  `<a class="tab${key === view ? ' on' : ''}" href="${BOARD_URL}?view=${key}" target="_top">${label}<span class="t-c">${requests.filter(test).length}</span></a>`).join('');

const rowsHtml = shown.slice(0, 15).map((r) => {
  const [label, tone] = statusOf(r);
  return `<tr>
    <td class="c-ref"><span class="ref">${esc(r.request_id)}</span><span class="time">${esc(when(r.received_at))}</span></td>
    <td class="c-from">${esc(firstName(r.requester_name))}${r.origin === 'internal' ? '<span class="tag">staff</span>' : ''}</td>
    <td class="c-title">${esc(titleOf(r))}</td>
    <td class="c-route">${routeOf(r)}</td>
    <td class="c-status"><span class="chip ${tone}">${esc(label)}</span></td>
  </tr>`;
}).join('');

const emptyText = total
  ? `<p><b>Nothing here.</b> No requests in “${esc(VIEWS[view][0])}” right now.</p>`
  : `<p><b>No requests yet.</b> Send the first one and watch Apprentice check it, plan it and route it.</p><a class="btn small" href="${FORM_URL}" target="_blank" rel="noopener">Send a request <span aria-hidden="true">→</span></a>`;

const rulesHtml = rules.slice(0, 6).map((r) => `<li class="rule"><q>${esc(r.rule)}</q>
  <div class="meta">${r.ai_department && r.human_department ? `<span><s>${esc(r.ai_department)}</s> → ${esc(r.human_department)}</span>` : `<span>${esc(r.agent === 'verifier' ? 'Verifier rule' : 'Rule')}</span>`}<span>taught by ${esc(r.created_by || 'a manager')}${r.created_at ? ` · ${esc(when(r.created_at))}` : ''}</span></div></li>`).join('');

const teamsHtml = teamNames.map((d) => {
  const n = perTeam[d] || 0;
  return `<li><span class="t-name">${esc(d)}</span><span class="t-bar"><i style="width:${Math.round((100 * n) / maxTeam)}%"></i></span><span class="t-n">${n}</span></li>`;
}).join('');

const now = new Date();
const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="only light">
<meta http-equiv="refresh" content="${REFRESH_SECONDS}">
<title>Live board · Apprentice</title>
<meta name="description" content="Apprentice checks every request, splits it into tasks and routes them to the right team. A manager makes the calls that matter.">
<link rel="icon" href="${FAVICON}">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600;700&family=Instrument+Serif:ital@0;1&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
/* Theme: Clouds by Alternate Futures brand specification (docs.alternatefutures.ai/brand-guide) */
:root{color-scheme:only light;--cream:#F9F5EE;--white:#FFFFFF;--brand:#000AFF;--brand-hover:#0008CC;--brand-tint:#EEF0FF;--dark-blue:#0000AF;--medium-blue:#A5B2FF;
--sky:#C8E0E4;--apricot:#FFC7AA;--terracotta:#BE4200;--terracotta-tint:#FBEADF;--text:#1A1A1A;--muted:#66635E;--hair:#E6DFD2;--hair-soft:#EFE9DE;--neutral:#F1ECE3;
--sans:'Instrument Sans','Segoe UI',system-ui,-apple-system,sans-serif;--serif:'Instrument Serif',Georgia,serif;--mono:'JetBrains Mono',ui-monospace,monospace}
*{box-sizing:border-box}html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--cream);color:var(--text);font:16px/1.55 var(--sans);font-variant-numeric:tabular-nums}
a{color:inherit}
.wrap{max-width:1200px;margin:0 auto;padding:0 28px}

/* app header */
.appbar{background:var(--white);border-bottom:1px solid var(--hair)}
.appbar .wrap{display:flex;align-items:center;gap:28px;height:64px}
.brand{display:flex;align-items:center;gap:10px;text-decoration:none;font-weight:700;font-size:20px;letter-spacing:-.01em;color:var(--dark-blue)}
.mark{width:30px;height:30px;flex:none}
.nav{display:flex;gap:4px;margin-right:auto}
.nav a{padding:8px 12px;border-radius:8px;text-decoration:none;color:var(--muted);font-weight:500;font-size:14px}
.nav a:hover{color:var(--text);background:var(--cream)}
.nav a.on{color:var(--brand);background:var(--brand-tint)}
.live{display:flex;align-items:center;gap:8px;color:var(--muted);font-size:13px;white-space:nowrap}
.dot{width:8px;height:8px;border-radius:50%;background:var(--brand);animation:pulse 2.4s ease-out infinite}
@keyframes pulse{0%{box-shadow:0 0 0 0 rgba(0,10,255,.4)}70%{box-shadow:0 0 0 8px rgba(0,10,255,0)}100%{box-shadow:0 0 0 0 rgba(0,10,255,0)}}
@media (prefers-reduced-motion:reduce){.dot{animation:none}}
.btn{display:inline-flex;align-items:center;gap:10px;background:var(--brand);color:var(--white);padding:10px 16px;border-radius:999px;font-weight:500;font-size:14px;text-decoration:none;white-space:nowrap}
.btn:hover{background:var(--brand-hover)}.btn.small{padding:9px 15px;font-size:13.5px}

/* page header */
.pagehead{display:flex;align-items:flex-end;justify-content:space-between;gap:24px;padding:34px 0 22px}
.eyebrow{margin:0 0 6px;font-family:var(--mono);font-size:12px;letter-spacing:.04em;color:var(--muted);text-transform:uppercase}
h1{margin:0;font-weight:700;font-size:clamp(32px,3.6vw,44px);line-height:1.06;letter-spacing:-.02em;color:var(--dark-blue)}
.lede{margin:8px 0 0;font-size:16px;max-width:62ch}
.tagline{margin:0;font-family:var(--serif);font-size:24px;line-height:1.2;text-align:right;white-space:nowrap;color:var(--dark-blue)}
.tagline em{font-style:italic;color:var(--brand)}

/* pipeline */
.label{margin:0 0 10px;font-size:12px;letter-spacing:.07em;text-transform:uppercase;color:var(--muted);font-weight:600}
.pipeline{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(5,minmax(0,1fr));background:var(--white);border:1px solid var(--hair);border-radius:16px;overflow:hidden}
.stage{position:relative;display:grid;grid-template-columns:auto 1fr;grid-template-areas:"n v" "l l" "note note";gap:2px 10px;padding:16px 18px 18px;border-left:1px solid var(--hair-soft)}
.stage:first-child{border-left:0}
.stage:not(:last-child)::after{content:"";position:absolute;right:-7px;top:50%;width:12px;height:12px;background:var(--white);border-top:1px solid var(--hair);border-right:1px solid var(--hair);transform:translateY(-50%) rotate(45deg);z-index:1}
.s-n{grid-area:n;align-self:center;display:inline-grid;place-items:center;width:22px;height:22px;border-radius:6px;background:var(--neutral);font-family:var(--mono);font-size:11.5px;color:var(--muted)}
.s-v{grid-area:v;font-weight:700;font-size:30px;line-height:1;color:var(--dark-blue)}
.s-l{grid-area:l;margin-top:8px;font-weight:600;font-size:14px}
.s-note{grid-area:note;color:var(--muted);font-size:12.5px;line-height:1.35}
.stage.human{background:var(--brand-tint)}.stage.human::after{background:var(--brand-tint)}
.stage.human .s-n{background:var(--brand);color:var(--white)}.stage.human .s-v{color:var(--brand)}
.stage.end .s-v{color:var(--muted)}

/* KPI cards */
.kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px;margin:18px 0 0}
.kpi{background:var(--white);border:1px solid var(--hair);border-radius:14px;padding:16px 18px}
.k-l{font-size:13px;color:var(--muted);font-weight:500}
.k-v{margin-top:6px;font-weight:700;font-size:30px;line-height:1.05;color:var(--dark-blue)}
.k-note{margin-top:4px;color:var(--muted);font-size:12.5px}
.kpi.accent .k-v{color:var(--brand)}

/* main grid */
.main{display:grid;grid-template-columns:minmax(0,1fr) 330px;gap:28px;padding:30px 0 48px;align-items:start}
.panel{background:var(--white);border:1px solid var(--hair);border-radius:16px;overflow:hidden}
.panel-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 18px;border-bottom:1px solid var(--hair-soft)}
h2{margin:0;font-weight:600;font-size:18px;letter-spacing:-.01em;color:var(--dark-blue)}
.side h2{font-family:var(--serif);font-weight:400;font-size:23px;letter-spacing:0}
.panel-sub{margin:0;color:var(--muted);font-size:12.5px}
.panel-sub s{text-decoration-thickness:2px}
.panel-sub b{color:var(--brand);font-weight:600}

/* tabs */
.tabs{display:flex;gap:4px;padding:10px 12px 0;border-bottom:1px solid var(--hair-soft);overflow-x:auto}
.tab{display:inline-flex;align-items:center;gap:8px;padding:9px 12px;text-decoration:none;color:var(--muted);font-weight:500;font-size:14px;border-bottom:2px solid transparent;margin-bottom:-1px;white-space:nowrap}
.tab:hover{color:var(--text)}.tab.on{color:var(--brand);border-bottom-color:var(--brand)}
.t-c{min-width:22px;padding:1px 7px;border-radius:999px;background:var(--neutral);font-size:12px;text-align:center;color:var(--muted)}
.tab.on .t-c{background:var(--brand);color:var(--white)}

/* table */
table{width:100%;border-collapse:collapse}
th{padding:10px 18px;text-align:left;font-size:11.5px;letter-spacing:.07em;text-transform:uppercase;color:var(--muted);font-weight:600;background:#FCFAF6;border-bottom:1px solid var(--hair-soft)}
td{padding:14px 18px;border-bottom:1px solid var(--hair-soft);vertical-align:middle}
tr:last-child td{border-bottom:0}
tbody tr:hover td{background:#FCFAF6}
.ref{display:block;font-family:var(--mono);font-size:12.5px;font-feature-settings:'liga' 1,'calt' 1}
.time{display:block;color:var(--muted);font-size:12.5px}
.tag{margin-left:6px;padding:1px 6px;border:1px solid var(--hair);border-radius:6px;font-size:11px;color:var(--muted);vertical-align:1px}
.c-title{font-weight:500;line-height:1.35}
.c-route{font-size:14px;line-height:1.35}
.c-route s{color:var(--muted);text-decoration-thickness:2px}
.c-route .arrow{margin:0 6px;color:var(--muted)}
.c-route b{font-weight:600;white-space:nowrap;color:var(--brand)}
.c-route .by{display:block;margin-top:2px;color:var(--muted);font-size:12.5px}
.dim{color:var(--muted)}
.chip{display:inline-flex;align-items:center;gap:7px;padding:4px 10px;border-radius:999px;font-size:12.5px;font-weight:500;line-height:1.3;white-space:nowrap}
.chip::before{content:"";width:6px;height:6px;border-radius:50%;background:currentColor;flex:none}
.chip.ok{background:var(--sky);color:var(--dark-blue)}
.chip.wait{background:var(--apricot);color:var(--text)}
.chip.wait-line{box-shadow:inset 0 0 0 1px var(--apricot);color:var(--text)}
.chip.flag{background:var(--terracotta-tint);color:var(--terracotta)}
.chip.muted{background:var(--neutral);color:var(--muted)}
.chip.muted-line,.chip.neutral{box-shadow:inset 0 0 0 1px var(--hair);color:var(--muted)}
.empty{padding:34px 24px;text-align:center}.empty p{margin:0 0 14px}

/* sidebar */
.side{display:grid;gap:22px}
.rules{list-style:none;margin:0;padding:0}
.rule{padding:15px 18px;border-top:1px solid var(--hair-soft)}.rule:first-child{border-top:0}
.rule q{display:block;font-family:var(--serif);font-size:19px;line-height:1.3;color:var(--dark-blue);quotes:"\\201C" "\\201D"}
.rule .meta{margin-top:8px;display:flex;flex-wrap:wrap;gap:4px 12px;color:var(--muted);font-size:12.5px}
.rule .meta s{text-decoration-thickness:2px}
.rules-empty{margin:0;padding:16px 18px;color:var(--muted);font-size:13.5px}
.teams{list-style:none;margin:0;padding:8px 18px 14px}
.teams li{display:grid;grid-template-columns:118px minmax(0,1fr) 26px;gap:10px;align-items:center;padding:7px 0;font-size:13.5px}
.t-bar{height:6px;background:var(--neutral);border-radius:999px;overflow:hidden}.t-bar i{display:block;height:100%;background:var(--dark-blue);border-radius:999px}
.t-n{text-align:right;font-family:var(--mono);font-size:12.5px;color:var(--muted)}

.foot{display:flex;justify-content:space-between;flex-wrap:wrap;gap:10px 24px;padding:20px 0 36px;border-top:1px solid var(--hair);color:var(--muted);font-size:13px}

/* responsive */
@media (max-width:1080px){
  .main{grid-template-columns:1fr}
  .tagline{display:none}
  .pipeline{grid-template-columns:repeat(3,minmax(0,1fr))}
  .stage:nth-child(4){border-left:0}.stage:nth-child(n+4){border-top:1px solid var(--hair-soft)}
  .stage::after{display:none}
  .kpis{grid-template-columns:repeat(2,minmax(0,1fr))}
}
@media (max-width:760px){
  .wrap{padding:0 16px}
  .appbar .wrap{gap:12px}
  .nav,.live{display:none}
  .brand{margin-right:auto}
  .pipeline{grid-template-columns:1fr 1fr}
  .stage{border-left:0;border-top:1px solid var(--hair-soft)}
  .stage:nth-child(-n+2){border-top:0}.stage:nth-child(even){border-left:1px solid var(--hair-soft)}
  thead{display:none}
  table,tbody,tr,td{display:block;width:100%}
  tr{display:grid;grid-template-columns:minmax(0,1fr) auto;grid-template-areas:"ref status" "title title" "route route";gap:4px 12px;padding:14px 16px;border-bottom:1px solid var(--hair-soft)}
  td{padding:0;border:0}
  .c-ref{grid-area:ref;display:flex;gap:10px;align-items:baseline}.c-from{display:none}
  .c-title{grid-area:title}.c-route{grid-area:route}.c-status{grid-area:status}
}
</style>
</head>
<body>
<header class="appbar"><div class="wrap">
  <a class="brand" href="${BOARD_URL}" target="_top">${MARK}Apprentice</a>
  <nav class="nav" aria-label="Main">
    <a class="on" href="${BOARD_URL}" target="_top">Live board</a>
    <a href="${FORM_URL}" target="_blank" rel="noopener">Send a request</a>
    <a href="${INBOX_URL}" target="_top">Manager inbox</a>
  </nav>
  <span class="live"><span class="dot"></span>Live · ${esc(clock(now))} PKT</span>
  <a class="btn" href="${FORM_URL}" target="_blank" rel="noopener">Send a request <span aria-hidden="true">→</span></a>
</div></header>

<main class="wrap">
  <section class="pagehead">
    <div>
      <p class="eyebrow">Orbit Studio · request pipeline</p>
      <h1>Live board</h1>
      <p class="lede">Apprentice checks every request, plans the work and routes it to the right team. A manager makes the calls that matter, and each rule they teach is remembered.</p>
    </div>
    <p class="tagline">AI sorts the work.<br><em>People make the call.</em></p>
  </section>

  <p class="label">How requests flow</p>
  <ol class="pipeline">
    ${stage('1', 'Received', total, 'From the website form or staff')}
    ${stage('2', 'Checked by AI', checked, 'Genuine, clear and our kind of work?')}
    ${stage('3', 'With a manager', waiting, 'Needs a human decision', 'human')}
    ${stage('4', 'Sent to teams', sent.length, 'Tasks posted in team channels')}
    ${stage('–', 'Declined', declined, 'Nothing was assigned', 'end')}
  </ol>

  <section class="kpis" aria-label="Key numbers">
    ${kpi('Handled automatically', auto, sent.length ? `${pct(auto, sent.length)} of requests sent to teams` : 'None sent to teams yet')}
    ${kpi('Decided by a manager', decided, 'Approvals, corrections and declines')}
    ${kpi('Approved as proposed', pct(asProposed, reviewedSent.length), 'Plans a manager approved without changes', 'accent')}
    ${kpi('Rules learned', rules.length, 'Taught by managers, applied every time')}
  </section>

  <div class="main">
    <section class="panel" aria-labelledby="requests">
      <div class="panel-head"><h2 id="requests">Requests</h2><p class="panel-sub">Newest first · <s>struck out</s> = Apprentice's choice · <b>blue</b> = the manager's call</p></div>
      <nav class="tabs" aria-label="Filter requests">${tabs}</nav>
      ${shown.length ? `<table><thead><tr><th>Reference</th><th>From</th><th>Request</th><th>Who handles it</th><th>Status</th></tr></thead><tbody>${rowsHtml}</tbody></table>` : `<div class="empty">${emptyText}</div>`}
    </section>

    <aside class="side">
      <section class="panel" aria-labelledby="learned">
        <div class="panel-head"><h2 id="learned">What Apprentice has learned</h2></div>
        ${rules.length ? `<ul class="rules">${rulesHtml}</ul>` : '<p class="rules-empty">Nothing yet. When a manager corrects a request and ticks <i>Save as a rule</i>, the rule appears here and Apprentice follows it from then on.</p>'}
      </section>
      <section class="panel" aria-labelledby="teams">
        <div class="panel-head"><h2 id="teams">Work per team</h2><p class="panel-sub">Tasks sent</p></div>
        <ul class="teams">${teamsHtml}</ul>
      </section>
    </aside>
  </div>
</main>

<footer class="wrap"><div class="foot">
  <span>Apprentice · AI sorts the work. People make the call.</span>
  <span>Built with n8n, hosted on Clouds by Alternate Futures · Updates every ${REFRESH_SECONDS} seconds · Emails, budgets and messages are never shown here</span>
</div></footer>
</body>
</html>`;

return [{ json: { html } }];
