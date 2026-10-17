// Guardrails pick the lane. Rules live here in code, not in the model.
const req = $('Normalize').first().json;
const depts = $('Rule checks').first().json.dept_names;
const plan = $json.output || {};
const tasks = (Array.isArray(plan.tasks) ? plan.tasks : []).slice(0, 6).map((t, i) => ({
  step: Number(t.step) || i + 1,
  title: String(t.title || 'Untitled task').slice(0, 120),
  details: String(t.details || '').slice(0, 300),
  department: String(t.department || ''),
  effort: ['S', 'M', 'L'].includes(t.effort) ? t.effort : 'M',
  confidence: Math.max(0, Math.min(1, Number(t.confidence) || 0)),
  reason: String(t.reason || '').slice(0, 200),
}));

const why = [];
// origin comes from WHICH form was used, never from the request-type dropdown
if (req.origin !== 'internal') why.push('External request: needs sign-off');
if (['$5k–20k', '$20k+'].includes(req.budget)) why.push('High value');
if (!tasks.length) why.push('Planner returned no tasks');
if (!depts.includes(plan.primary_department)) why.push(`Unknown owner "${plan.primary_department}"`);
for (const t of tasks) {
  if (!depts.includes(t.department)) { why.push(`Unknown department "${t.department}"`); t.confidence = 0; }
  else if (!(t.confidence >= 0.75)) why.push(`Low confidence: ${t.title} → ${t.department}`);
}
if (req.deadline && (new Date(req.deadline) - Date.now()) / 864e5 < 3) why.push('Deadline in under 3 days');

const lane = why.length ? 'review' : 'auto';
return [{ json: {
  lane,
  auto: lane === 'auto',
  review_reasons: why,
  primary_department: depts.includes(plan.primary_department) ? plan.primary_department : (tasks[0] && tasks[0].department) || depts[0],
  routing_reason: String(plan.routing_reason || '').slice(0, 300),
  tasks,
} }];
