// Apprentice · task cards for each team's Discord channel
// n8n Code node · "Run Once for All Items" · output: one item per channel. Then an HTTP Request node:
//   Method POST · URL {{ $json.url }} · Send Body: JSON · Body {{ JSON.stringify($json.body) }}
//   Settings: Retry On Fail (3 tries, 2 s) · On Error → Continue · Options → Batching: 1 item every 500 ms
// Reads nodes by name: Normalize, Verifier agent, Guardrails, Load departments, Apply decision (review lane only).
// Webhook URLs come from the departments table, so the exported workflow holds no secrets.

const get = (node) => { try { return $(node).first().json; } catch (e) { return null; } };
const req = get('Normalize') || {};
const ver = (get('Verifier agent') || {}).output || {};
const plan = get('Guardrails') || {};
const decision = get('Apply decision'); // null in the auto lane
const depts = $('Load departments').all().map((i) => i.json).filter((d) => d.name && !String(d.name).startsWith('_'));
const hook = Object.fromEntries(depts.map((d) => [d.name, d.discord_webhook]));

const clip = (s, n) => { const t = String(s ?? '').trim(); return t.length > n ? t.slice(0, n - 1) + '…' : t; };
const safe = (s, n) => clip(s, n).replace(/@/g, '@​');
const COLOR = { task: 0x2f6b4f, owner: 0x1b1a17, corrected: 0xc8361e };

const auto = plan.lane === 'auto';
const owner = (decision && decision.final_department) || plan.primary_department;
const corrected = !auto && decision && decision.final_department && decision.final_department !== plan.primary_department;
const byline = auto ? 'Assigned automatically by Apprentice' : `Approved by ${safe(decision?.reviewer || 'a manager', 40)}`;
const title = ver.title || 'New request';
const tasks = Array.isArray(plan.tasks) ? plan.tasks : [];

const byDept = {};
for (const t of tasks) (byDept[t.department] ||= []).push(t);
if (owner && !byDept[owner]) byDept[owner] = []; // the owner always hears about it

const items = [];
for (const [dept, list] of Object.entries(byDept)) {
  const embeds = [];
  if (dept === owner) {
    embeds.push({
      color: corrected ? COLOR.corrected : COLOR.owner,
      title: safe(`You own ${req.request_id} · ${title}`, 250),
      ...(ver.summary ? { description: safe(ver.summary, 700) } : {}), // Discord rejects empty descriptions
      fields: [
        { name: 'From', value: safe([String(req.requester_name || '').trim().split(/\s+/)[0], req.company].filter(Boolean).join(' · ') || '–', 200), inline: true },
        { name: 'Deadline', value: safe(req.deadline || 'Not given', 60), inline: true },
        { name: 'Decision', value: safe(corrected ? `${byline}, who moved it here from ${plan.primary_department}` : byline, 250), inline: true },
        { name: 'Full plan', value: safe(tasks.map((t) => `${t.step}. ${t.title} → ${t.department}`).join('\n') || '–', 1000) },
      ],
    });
  }
  if (list.length) {
    embeds.push({
      color: COLOR.task,
      title: safe(`${list.length} task${list.length > 1 ? 's' : ''} for ${dept} · ${req.request_id}`, 250),
      description: `**${safe(title, 120)}**\n${byline}`,
      fields: list.slice(0, 10).map((t) => ({
        name: safe(`${t.step}. ${t.title}`, 250),
        value: safe(`${t.details || ''}\nEffort ${t.effort || '?'}${typeof t.confidence === 'number' ? ` · ${Math.round(t.confidence * 100)}% sure` : ''}`, 1000),
      })),
      footer: { text: 'Apprentice · AI sorts the work. People make the call.' },
      timestamp: new Date().toISOString(),
    });
  }
  items.push({ json: { department: dept, url: hook[dept] || null, body: { username: 'Apprentice', allowed_mentions: { parse: [] }, embeds } } });
}

const missing = items.filter((i) => !i.json.url).map((i) => i.json.department);
if (missing.length) throw new Error(`No Discord webhook in the departments table for: ${missing.join(', ')}`);
return items;
