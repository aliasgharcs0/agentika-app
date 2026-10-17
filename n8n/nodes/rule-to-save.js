// If the manager chose "save as a rule", returns the rule row; otherwise nothing (this branch stops).
// KIND ('plan' | 'flagged') is set by the builder above this line.
const req = $('Normalize').first().json;
let d = null;
try { d = $(KIND === 'plan' ? 'Apply decision' : 'Apply flagged decision').first().json; } catch (e) { /* not run */ }
if (!d || !d.save_rule) return [];
let plan = null;
try { plan = $('Guardrails').first().json; } catch (e) { /* flagged path */ }
return [{ json: {
  created_at: new Date().toISOString(),
  created_by: d.reviewer,
  agent: KIND === 'plan' ? 'planner' : 'verifier',
  ai_department: KIND === 'plan' && plan ? plan.primary_department : '',
  human_department: KIND === 'plan' ? d.final_department : '',
  rule: d.reviewer_note,
  active: true,
  request_id: req.request_id,
} }];
