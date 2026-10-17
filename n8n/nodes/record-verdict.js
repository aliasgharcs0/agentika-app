// Turns the Verifier's structured output into clean fields (and never trusts it blindly).
const v = $json.output || {};
const STATUSES = ['verified', 'needs_info', 'suspicious', 'out_of_scope'];
const status = STATUSES.includes(v.status) ? v.status : 'needs_info'; // unsure → ask, never pass
const list = (x, n) => (Array.isArray(x) ? x : []).map((s) => String(s).trim()).filter(Boolean).slice(0, n);
return [{ json: {
  verified: status === 'verified',
  verification: status,
  verification_reasons: list(v.reasons, 3).join(' · '),
  questions: list(v.clarifying_questions, 3),
  title: String(v.title || '').trim().slice(0, 60),
  summary: String(v.summary || '').trim().slice(0, 300),
  priority: ['high', 'normal', 'low'].includes(v.priority) ? v.priority : 'normal',
} }];
