// Manager inbox: every request waiting for a decision (password-protected). GET /webhook/inbox
const rows = $('Get waiting').all().map((i) => i.json).filter((r) => r.request_id && r.status === 'awaiting_review')
  .sort((a, b) => String(a.received_at).localeCompare(String(b.received_at)));
const TITLES = { 'A new project': 'New project', 'Support for existing work': 'Support request', 'Something else': 'Request', 'Internal task': 'Internal task' };
const items = rows.map((r) => {
  let kind = 'plan';
  try { kind = JSON.parse(r.review_json || '{}').kind || 'plan'; } catch (e) { /* default */ }
  const first = String(r.requester_name || 'Someone').trim().split(/\s+/)[0];
  return `<li><div><span class="ref">${esc(r.request_id)} · ${esc(when(r.received_at))} · ${esc(first)}</span><br><b>${esc(r.title || TITLES[r.request_type] || 'Request')}</b>
<span class="chip ${kind === 'flagged' ? 'flag' : ''}" style="margin-left:8px">${kind === 'flagged' ? 'Flagged' : 'Plan to approve'}</span></div>
<a class="btn" href="${BASE}/webhook/review?id=${encodeURIComponent(r.request_id)}&amp;t=${esc(r.review_token)}" target="_top">Review <span aria-hidden="true">→</span></a></li>`;
}).join('');
const html = shell('Manager inbox', `<h1>Waiting for you</h1>
<p class="summary">${rows.length ? `${rows.length} request${rows.length > 1 ? 's' : ''} need a decision. Oldest first.` : 'Nothing is waiting. Apprentice posts here, and in your review channel, when a request needs you.'}</p>
${rows.length ? `<ul class="list">${items}</ul>` : ''}`, 'Manager inbox');
return [{ json: { html } }];
