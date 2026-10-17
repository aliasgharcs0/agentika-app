// The manager's review page: GET /webhook/review?id=REQ-…&t=<token>. Server-rendered, no JavaScript.
const q = $('Review link').first().json.query || {};
const row = $('Get request').all().map((i) => i.json).find((r) => r.request_id === q.id);
const depts = $('Load departments').all().map((i) => i.json).filter((d) => d.name && !String(d.name).startsWith('_')).map((d) => d.name);
const TITLES = { 'A new project': 'New project', 'Support for existing work': 'Support request', 'Something else': 'Request', 'Internal task': 'Internal task' };

function header(row, r) {
  const first = String(row.requester_name || 'Someone').trim().split(/\s+/)[0];
  const from = [first, row.company].filter(Boolean).join(' · ');
  return `<p class="eyebrow">${esc(row.request_id)} · ${esc(when(row.received_at))} · from ${esc(from)}${row.origin === 'internal' ? ' (staff)' : ''}</p>
<h1>${esc(row.title || TITLES[row.request_type] || 'Request')}</h1>
${row.summary ? `<p class="summary">${esc(row.summary)}</p>` : ''}`;
}
function wrote(row) {
  const first = String(row.requester_name || 'Someone').trim().split(/\s+/)[0];
  const meta = [row.request_type, row.budget && `Budget ${row.budget}`, row.deadline && `Deadline ${row.deadline}`].filter(Boolean).join(' · ');
  return `<section><h3>What ${esc(first)} wrote (unverified)</h3><blockquote>${esc(row.raw_text)}</blockquote>${meta ? `<p class="meta">${esc(meta)}</p>` : ''}</section>`;
}
const common = (row) => `<input type="hidden" name="id" value="${esc(row.request_id)}"><input type="hidden" name="t" value="${esc(row.review_token)}">
<label class="field">Why? <span class="hint">A short reason. If you save it as a rule, Apprentice reads it on every future request.</span><textarea name="why" placeholder="e.g. Public-sector clients go to Finance &amp; Legal first because of tender rules"></textarea></label>`;
const nameField = `<label class="field">Your name <span class="hint">Recorded with the decision.</span><input type="text" name="reviewer" required placeholder="e.g. Ayesha"></label>
<button class="btn" type="submit">Record decision <span aria-hidden="true">→</span></button>`;

function planPage(row, r) {
  const chips = (r.review_reasons || []).map((x) => `<span class="chip">${esc(x)}</span>`).join('');
  const plan = (r.tasks || []).map((t) => `<li><span class="n">${esc(t.step)}</span><span class="t"><b>${esc(t.title)}</b>${t.details ? `<span>${esc(t.details)}</span>` : ''}</span><span class="d">${esc(t.department)}</span><span class="c">${Math.round((Number(t.confidence) || 0) * 100)}%</span></li>`).join('');
  const options = depts.map((d) => `<option${d === r.primary_department ? ' selected' : ''}>${esc(d)}</option>`).join('');
  return shell(`Review ${row.request_id}`, `${header(row, r)}
<div class="chips">${chips}</div>
<div class="grid2"><div class="box"><h3>Apprentice's check</h3><p><b>${esc(r.verification || 'verified')}</b>${r.verification_reasons ? ` · ${esc(r.verification_reasons)}` : ''}</p></div>
<div class="box"><h3>Proposed owner</h3><p><b>${esc(r.primary_department)}</b>${r.routing_reason ? `<br><span class="meta">${esc(r.routing_reason)}</span>` : ''}</p></div></div>
<section><h3>Plan</h3><ol class="plan">${plan}</ol></section>
${wrote(row)}
<form method="post" action="${BASE}/webhook/review-submit">
<fieldset class="choices"><legend class="sr" hidden>Decision</legend>
<label class="choice"><input type="radio" name="decision" value="approve" required><b>Approve</b><span>Send the plan to the teams as proposed.</span></label>
<label class="choice pencil"><input type="radio" name="decision" value="change"><b>Approve, but change the owner</b><span>Pick the team that should own it.</span></label>
<label class="choice"><input type="radio" name="decision" value="decline"><b>Decline</b><span>Nothing is assigned.</span></label></fieldset>
<label class="field reveal reveal-change">New owner<select name="owner">${options}</select></label>
${common(row)}
<label class="check reveal reveal-change"><input type="checkbox" name="save_rule" value="yes"><span>Save this as a rule for next time</span><span class="hint">Apprentice will follow it on similar requests. Leave it unticked for one-off exceptions.</span></label>
${nameField}</form>`);
}

function flaggedPage(row, r) {
  const reasons = String(r.verification_reasons || '').split(' · ').filter(Boolean);
  if (r.burst) reasons.unshift('3 or more requests from this email in the last hour, so the AI was skipped');
  if (r.duplicate_of) reasons.push(`Possible duplicate of ${r.duplicate_of}`);
  const qs = (r.questions || []).map((x) => `<li>${esc(x)}</li>`).join('');
  return shell(`Review ${row.request_id}`, `${header(row, r)}
<div class="chips"><span class="chip flag">Flagged: ${esc(r.verification || 'not checked')}</span></div>
<section><h3>Why Apprentice flagged it</h3><ul>${reasons.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></section>
${qs ? `<section><h3>Questions Apprentice would ask</h3><ol>${qs}</ol></section>` : ''}
${wrote(row)}
<form method="post" action="${BASE}/webhook/review-submit">
<fieldset class="choices">
<label class="choice"><input type="radio" name="decision" value="plan" required><b>It's fine, plan it</b><span>Apprentice plans it and it comes back to you if needed.</span></label>
<label class="choice"><input type="radio" name="decision" value="ask"><b>Ask for more detail</b><span>Marked as waiting for the sender.</span></label>
<label class="choice"><input type="radio" name="decision" value="decline"><b>Decline</b><span>Nothing is assigned.</span></label></fieldset>
${common(row)}
<label class="check reveal reveal-plan"><input type="checkbox" name="save_rule" value="yes"><span>Save this as a rule for next time</span><span class="hint">Apprentice will stop flagging similar requests.</span></label>
${nameField}</form>`);
}

let html;
if (!row || !q.t || row.review_token !== q.t) {
  html = shell('Link not valid', '<h1>This link isn\'t valid</h1><p class="summary">It may be mistyped, or the request was reset.</p>');
} else if (row.status !== 'awaiting_review') {
  html = shell('Already decided', `<p class="eyebrow">${esc(row.request_id)}</p><h1>Already decided</h1><p class="summary">${esc(row.decision || row.status)}${row.reviewer ? ` by ${esc(row.reviewer)}` : ''}${row.decided_at ? `, ${esc(when(row.decided_at))}` : ''}.</p><a class="btn line" href="${BASE}/webhook/board" target="_top">Open the live board</a>`);
} else {
  let r = {};
  try { r = JSON.parse(row.review_json || '{}'); } catch (e) { /* bad json → plan defaults */ }
  html = r.kind === 'flagged' ? flaggedPage(row, r) : planPage(row, r);
}
return [{ json: { html } }];
