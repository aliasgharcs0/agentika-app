// One line in the activity log for every finished request. Skipped if no log channel is connected.
const req = $('Normalize').first().json;
const url = hookOf('_log');
if (!url) return [];
const ver = get('Record verdict') || {};
const plan = get('Guardrails');
const dec = get('Apply decision');
const fdec = get('Apply flagged decision');
const assigned = !!get('Mark assigned');
const title = ver.title || TYPE_TITLES[req.request_type] || 'Request';

let color = 'muted';
let line = () => 'Closed';
if (assigned && plan) {
  const owner = (dec && dec.final_department) || plan.primary_department;
  if (plan.auto) { color = 'ok'; line = (f, u) => `${f.b(u(owner, 40))} · assigned automatically`; }
  else if (dec && dec.final_department !== plan.primary_department) {
    color = 'human';
    line = (f, u) => `${f.s(u(plan.primary_department, 40))} → ${f.b(u(owner, 40))} · corrected by ${u(dec.reviewer, 40)}`;
  } else { color = 'ok'; line = (f, u) => `${f.b(u(owner, 40))} · approved by ${u(dec ? dec.reviewer : 'a manager', 40)}`; }
} else {
  const d = dec || fdec || {};
  if (d.status === 'rejected') line = (f, u) => `Declined by ${u(d.reviewer, 40)}`;
  else if (d.status === 'expired') { color = 'wait'; line = () => 'No decision within 4 hours, so nothing was assigned'; }
  else if (d.status === 'needs_info') { color = 'wait'; line = (f, u) => `Waiting for more detail (asked by ${u(d.reviewer, 40)})`; }
}
return [{ json: { url, body: render(url, (f, u) => ({ title: `${req.request_id} · ${clip(title, 80)}`, color, lead: line(f, u) })) } }];
