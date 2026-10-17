// Posts any workflow failure to the activity log (if a log channel is connected).
const e = $('On error').first().json;
const url = hookOf('_log');
if (!url) return [];
const ex = e.execution || {};
const where = ex.lastNodeExecuted || 'an unknown step';
const msg = (ex.error && ex.error.message) || 'Unknown error';
return [{ json: { url, body: render(url, (f, u) => ({
  title: 'Something went wrong',
  color: 'alert',
  lead: `${f.b(u((e.workflow && e.workflow.name) || 'A workflow', 80))} stopped at ${f.b(u(where, 60))}: ${u(msg, 300)}`,
  footer: `Execution ${u(ex.id || '?', 20)}`,
})) } }];
