// Reads the manager's decision on a plan (from the review page). Silence = expired, never approved.
const body = $json.body && typeof $json.body === 'object' ? $json.body : {};
const plan = $('Guardrails').first().json;
const depts = $('Rule checks').first().json.dept_names;
const now = new Date().toISOString();
const reviewer = String(body.reviewer || '').trim().slice(0, 40) || 'a manager';
const why = String(body.why || '').trim().slice(0, 300);
const yes = (v) => v === true || ['yes', 'on', 'true'].includes(String(v).toLowerCase());

if (!body.decision) {
  return [{ json: { status: 'expired', decision: 'No decision', reviewer: '', reviewer_note: 'No decision within 4 hours', decided_at: now, final_department: '', approved: false, save_rule: false } }];
}
if (body.decision === 'decline') {
  return [{ json: { status: 'rejected', decision: 'Decline', reviewer, reviewer_note: why, decided_at: now, final_department: '', approved: false, save_rule: false } }];
}
const changed = body.decision === 'change' && depts.includes(body.owner) && body.owner !== plan.primary_department;
return [{ json: {
  status: 'approved',
  decision: changed ? 'Approve, but change the owner' : 'Approve',
  reviewer,
  reviewer_note: why,
  decided_at: now,
  final_department: changed ? body.owner : plan.primary_department,
  approved: true,
  save_rule: changed && yes(body.save_rule) && why.length > 3, // only lasting policies the manager chose to teach
} }];
