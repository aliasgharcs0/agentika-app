// Checks a submitted decision, then hands it to the waiting workflow. POST /webhook/review-submit.
const b = $('Decision submitted').first().json.body || {};
const row = $('Get request').all().map((i) => i.json).find((r) => r.request_id === b.id);
const DECISIONS = { approve: 'Approved', change: 'Approved with a new owner', decline: 'Declined', plan: 'Sent for planning', ask: 'Asked for more detail' };

let ok = false;
let html;
if (!row || !b.t || row.review_token !== b.t) {
  html = shell('Link not valid', '<h1>This link isn\'t valid</h1><p class="summary">Nothing was recorded.</p>');
} else if (row.status !== 'awaiting_review') {
  html = shell('Already decided', `<p class="eyebrow">${esc(row.request_id)}</p><h1>Already decided</h1><p class="summary">${esc(row.decision || row.status)}${row.reviewer ? ` by ${esc(row.reviewer)}` : ''}.</p><a class="btn line" href="${BASE}/webhook/board" target="_top">Open the live board</a>`);
} else if (!DECISIONS[b.decision] || !String(b.reviewer || '').trim()) {
  html = shell('Something is missing', '<h1>Pick a decision and add your name</h1><p class="summary">Go back and complete the form.</p>');
} else {
  ok = true;
  const ruled = (b.save_rule === 'yes') && String(b.why || '').trim().length > 3 && (b.decision === 'change' || b.decision === 'plan');
  const lines = {
    approve: 'Apprentice is sending the tasks to the teams now.',
    change: `${esc(b.owner)} now owns this request.`,
    decline: 'Nothing was assigned.',
    plan: 'Apprentice is planning it now.',
    ask: 'It is marked as waiting for more detail.',
  };
  html = shell('Decision recorded', `<p class="done" aria-hidden="true">✓</p><p class="eyebrow">${esc(row.request_id)}</p><h1>${DECISIONS[b.decision]}</h1>
<p class="summary">${lines[b.decision]}${ruled ? ' <b>Saved as a rule:</b> Apprentice will follow it from now on.' : ''}</p>
<a class="btn" href="${BASE}/webhook/board" target="_top">Watch it on the live board <span aria-hidden="true">→</span></a>`);
}

// The waiting execution listens on n8n's own port; call it locally (not through the public proxy).
const resume = ok ? String(row.resume_url || '').replace(/^https?:\/\/[^/]+/, 'http://127.0.0.1:5678') : '';
const payload = ok ? {
  decision: b.decision, owner: b.owner || '', why: String(b.why || '').slice(0, 300),
  save_rule: b.save_rule === 'yes' ? 'yes' : 'no', reviewer: String(b.reviewer || '').trim().slice(0, 40),
} : {};
return [{ json: { ok, html, resume, payload } }];
