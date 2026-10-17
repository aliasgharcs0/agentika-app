// Reads the manager's decision on a flagged request. Silence = expired.
const body = $json.body && typeof $json.body === 'object' ? $json.body : {};
const now = new Date().toISOString();
const reviewer = String(body.reviewer || '').trim().slice(0, 40) || 'a manager';
const why = String(body.why || '').trim().slice(0, 300);
const yes = (v) => v === true || ['yes', 'on', 'true'].includes(String(v).toLowerCase());
const base = { reviewer, reviewer_note: why, decided_at: now, save_rule: false, plan_it: false };

if (!body.decision) return [{ json: { ...base, status: 'expired', decision: 'No decision', reviewer: '', reviewer_note: 'No decision within 4 hours' } }];
if (body.decision === 'plan') return [{ json: { ...base, status: 'verified', decision: "It's fine, plan it", plan_it: true, save_rule: yes(body.save_rule) && why.length > 3 } }];
if (body.decision === 'ask') return [{ json: { ...base, status: 'needs_info', decision: 'Ask for more detail' } }];
return [{ json: { ...base, status: 'rejected', decision: 'Decline' } }];
