// The manager's review card (Slack or Discord) + what the review page needs.
// KIND ('plan' | 'flagged') and BASE are set by the builder above this line.
const req = $('Normalize').first().json;
const rc = $('Rule checks').first().json;
const ver = get('Record verdict') || {
  verification: 'not checked', verification_reasons: 'Several requests from this email in the last hour, so the AI was skipped', questions: [],
};
const plan = KIND === 'plan' ? $('Guardrails').first().json : null;
const link = `${BASE}/webhook/review?id=${encodeURIComponent(req.request_id)}&t=${req.review_token}`;
const url = hookOf('_review');
const title = ver.title || TYPE_TITLES[req.request_type] || 'Request';
const first = String(req.requester_name || 'Someone').trim().split(/\s+/)[0];
const pct = (c) => `${Math.round((Number(c) || 0) * 100)}%`;

const body = !url ? null : render(url, (f, u) => (KIND === 'plan' ? {
  title: `Review needed · ${req.request_id} · ${clip(title, 80)}`,
  color: 'wait',
  lead: `Why you're seeing this: ${plan.review_reasons.map((r) => u(r, 120)).join(' · ')}`,
  fields: [
    ["Apprentice's check", `${u(ver.verification, 30)}${ver.verification_reasons ? ` · ${u(ver.verification_reasons, 240)}` : ''}`],
    ['Proposed owner', `${u(plan.primary_department, 40)}${plan.routing_reason ? `\n${u(plan.routing_reason, 200)}` : ''}`],
  ],
  sections: [{ heading: `Plan (${plan.tasks.length} task${plan.tasks.length === 1 ? '' : 's'})`, lines: plan.tasks.map((t) => `${t.step}. ${u(t.title, 90)} → ${u(t.department, 40)} (${pct(t.confidence)} sure)`) }],
  quote: { label: `What ${u(first, 40)} wrote (unverified)`, text: u(req.raw_text, 600) },
  button: { text: 'Review and decide', url: link },
  footer: 'Approve, change the owner or decline. Save it as a rule only if it should apply every time.',
} : {
  title: `Flagged · ${req.request_id} · ${clip(title, 80)}`,
  color: 'alert',
  lead: `Apprentice's check: ${f.b(u(ver.verification, 30))}`,
  sections: [
    { lines: [
      ...(rc.burst ? ['• 3 or more requests from this email in the last hour, so the AI was skipped'] : []),
      ...String(ver.verification_reasons || '').split(' · ').filter(Boolean).map((r) => `• ${u(r, 160)}`),
      ...(rc.duplicate_of ? [`• Possible duplicate of ${u(rc.duplicate_of, 20)}`] : []),
    ] },
    { heading: 'Questions Apprentice would ask', lines: (ver.questions || []).map((q, i) => `${i + 1}. ${u(q, 160)}`) },
  ],
  quote: { label: `What ${u(first, 40)} wrote (unverified)`, text: u(req.raw_text, 600) },
  button: { text: 'Review and decide', url: link },
  footer: 'Plan it anyway, ask for more detail, or decline.',
}));

const review_json = JSON.stringify(KIND === 'plan'
  ? { kind: 'plan', primary_department: plan.primary_department, routing_reason: plan.routing_reason, review_reasons: plan.review_reasons, tasks: plan.tasks, verification: ver.verification, verification_reasons: ver.verification_reasons }
  : { kind: 'flagged', verification: ver.verification, verification_reasons: ver.verification_reasons, questions: ver.questions || [], burst: !!rc.burst, duplicate_of: rc.duplicate_of || '' });

return [{ json: { url, body, has_channel: !!url, resume_url: $execution.resumeUrl, review_json, review_link: link } }];
