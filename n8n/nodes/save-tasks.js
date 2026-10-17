// One row per task for the tasks table.
const req = $('Normalize').first().json;
const plan = $('Guardrails').first().json;
let owner = plan.primary_department;
try { owner = $('Apply decision').first().json.final_department || owner; } catch (e) { /* auto lane */ }
const tasks = plan.tasks.length ? plan.tasks : [{ step: 1, title: 'Review the request and plan next steps', details: '', department: owner, effort: 'S', confidence: 1 }];
return tasks.map((t) => ({ json: {
  request_id: req.request_id, step: t.step, title: t.title, details: t.details,
  department: t.department, effort: t.effort, confidence: t.confidence, status: 'sent',
} }));
