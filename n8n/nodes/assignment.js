// Final owner for the request row (the manager's choice wins over the AI's).
const plan = $('Guardrails').first().json;
let owner = plan.primary_department;
try { owner = $('Apply decision').first().json.final_department || owner; } catch (e) { /* auto lane */ }
return [{ json: { status: 'assigned', final_department: owner } }];
