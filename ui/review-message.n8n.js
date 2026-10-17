// Apprentice · manager review message
// n8n Code node · "Run Once for All Items" · put it right before EACH Discord "Send and Wait" node,
// then set that node's Message to: {{ $json.review_message }}
// Works for both reviews: the plan review (Guardrails ran) and the flagged review (it didn't).
// Reads nodes by name: Normalize, Rule checks, Verifier agent, Guardrails.

const get = (node) => { try { return $(node).first().json; } catch (e) { return null; } };
const req = get('Normalize') || {};
const checks = get('Rule checks') || {};
const ver = (get('Verifier agent') || {}).output || {};
const plan = get('Guardrails'); // null in the flagged branch

// Request text comes from strangers: no pings, no markdown tricks, no clickable links.
const clean = (s, max) => {
  let t = String(s ?? '').replace(/\r/g, '').trim();
  if (t.length > max) t = t.slice(0, max - 1) + '…';
  return t
    .replace(/([\\*_~`|>#[\]()])/g, '\\$1')
    .replace(/@/g, '@​')
    .replace(/(h)ttp(s?):\/\//gi, '$1xxp$2://');
};
const quote = (s, max) => clean(s, max).split('\n').filter((l) => l.trim()).slice(0, 8).map((l) => `> ${l}`).join('\n') || '> (empty)';
const pct = (c) => (typeof c === 'number' ? `${Math.round(c * 100)}%` : '?');

const id = req.request_id || 'REQ-?';
const title = clean(ver.title || req.request_type || 'Request', 80);
const from = clean(String(req.requester_name || 'Someone').trim().split(/\s+/)[0], 40);
const lines = [];

if (plan) {
  lines.push(`**Review needed · ${id} · ${title}**`);
  lines.push(`Why you're seeing this: ${(plan.review_reasons || []).map((r) => clean(r, 120)).join(' · ') || 'manager sign-off'}`);
  lines.push('');
  lines.push(`**Apprentice's check:** ${clean(ver.status || 'verified', 30)}${(ver.reasons || []).length ? ' · ' + ver.reasons.map((r) => clean(r, 120)).join(' · ') : ''}`);
  lines.push(`**Proposed owner:** ${clean(plan.primary_department, 40)}${plan.routing_reason ? ' · ' + clean(plan.routing_reason, 220) : ''}`);
  lines.push(`**Plan (${(plan.tasks || []).length} tasks):**`);
  for (const t of (plan.tasks || []).slice(0, 6)) lines.push(`${t.step}. ${clean(t.title, 90)} → ${clean(t.department, 40)} (${pct(t.confidence)} sure)`);
} else {
  lines.push(`**Flagged · ${id} · ${title}**`);
  lines.push(`Apprentice's check: **${clean(ver.status || 'not checked', 30)}**`);
  if ((checks.recent_from_sender || 0) >= 3) lines.push('• 3 or more requests from this email in the last hour, so the AI was skipped');
  for (const r of (ver.reasons || []).slice(0, 3)) lines.push(`• ${clean(r, 160)}`);
  if (checks.duplicate_of) lines.push(`• Possible duplicate of ${clean(checks.duplicate_of, 20)}`);
  if ((ver.clarifying_questions || []).length) {
    lines.push('', '**Questions Apprentice would ask:**');
    ver.clarifying_questions.slice(0, 3).forEach((q, i) => lines.push(`${i + 1}. ${clean(q, 160)}`));
  }
}

lines.push('', `**What ${from} wrote** (unverified${req.origin === 'internal' ? ', staff form' : ''}):`, quote(req.raw_text, 600));
lines.push('', plan
  ? 'Approve, change the owner or decline. Save it as a rule only if it should apply every time.'
  : 'Plan it anyway, ask for more detail, or decline.');

let review_message = lines.join('\n');
if (review_message.length > 1900) review_message = review_message.slice(0, 1899) + '…'; // Discord limit is 2,000

return [{ json: { ...$input.first().json, review_message } }];
