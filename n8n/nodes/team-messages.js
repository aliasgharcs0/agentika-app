// Task cards for each team's channel, plus an ownership brief for the owner team.
// Teams without a connected channel are skipped (the board still shows everything).
const req = $('Normalize').first().json;
const ver = get('Record verdict') || {};
const plan = $('Guardrails').first().json;
const dec = get('Apply decision');
const owner = (dec && dec.final_department) || plan.primary_department;
const corrected = !plan.auto && dec && dec.final_department && dec.final_department !== plan.primary_department;
const byline = plan.auto ? 'Assigned automatically by Apprentice' : `Approved by ${clip(dec ? dec.reviewer : 'a manager', 40)}`;
const title = ver.title || TYPE_TITLES[req.request_type] || 'Request';

const byDept = {};
for (const t of plan.tasks) (byDept[t.department] = byDept[t.department] || []).push(t);
if (owner && !byDept[owner]) byDept[owner] = [];

const items = [];
for (const [dept, list] of Object.entries(byDept)) {
  const url = hookOf(dept);
  if (!url) continue;
  if (dept === owner) {
    items.push({ json: { url, body: render(url, (f, u) => ({
      title: `You own ${req.request_id} · ${clip(title, 80)}`,
      color: corrected ? 'human' : 'ink',
      lead: u(ver.summary || req.raw_text, 600),
      fields: [
        ['From', u([String(req.requester_name || '').trim().split(/\s+/)[0], req.company].filter(Boolean).join(' · ') || '–', 120)],
        ['Deadline', u(req.deadline || 'Not given', 40)],
        ['Decision', corrected ? `${u(byline, 80)}, who moved it here from ${u(plan.primary_department, 40)}` : u(byline, 80)],
      ],
      sections: [{ heading: 'Full plan', lines: plan.tasks.map((t) => `${t.step}. ${u(t.title, 90)} → ${u(t.department, 40)}`) }],
      footer: 'Apprentice · AI sorts the work. People make the call.',
    })) } });
  }
  if (list.length) {
    items.push({ json: { url, body: render(url, (f, u) => ({
      title: `${list.length} task${list.length > 1 ? 's' : ''} for ${dept} · ${req.request_id}`,
      color: 'ok',
      lead: `${f.b(u(title, 120))}\n${u(byline, 80)}`,
      sections: list.map((t) => ({ lines: [f.b(`${t.step}. ${u(t.title, 120)}`), u(t.details, 300), `Effort ${t.effort} · ${Math.round(t.confidence * 100)}% sure`] })),
      footer: 'Apprentice · AI sorts the work. People make the call.',
    })) } });
  }
}
return items;
