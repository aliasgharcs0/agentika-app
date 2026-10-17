// Runs the Code-node scripts with mock n8n data (Slack and Discord), and renders the manager pages.
// Usage: node product/n8n/test/run-nodes.mjs  → prints checks, writes review pages to test/out/
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const product = join(here, '..', '..');
const read = (p) => readFileSync(join(product, p), 'utf8');
const BASE = 'https://agentika-app.alternatefutures.ai';
const MSG = read('ui/messages.lib.js');
const PAGE = read('ui/page.lib.js');
mkdirSync(join(here, 'out'), { recursive: true });

function run(script, nodes, { json = {}, kind, libs = [] } = {}) {
  const prefix = `const BASE = ${JSON.stringify(BASE)};\n${kind ? `const KIND = ${JSON.stringify(kind)};\n` : ''}${libs.join('\n')}\n`;
  const $ = (name) => {
    if (!(name in nodes)) throw new Error(`Node '${name}' hasn't been executed`);
    const items = [].concat(nodes[name]).map((j) => ({ json: j }));
    return { first: () => items[0], all: () => items };
  };
  const fn = new Function('$', '$json', '$input', '$execution', prefix + read(script));
  return fn($, json, { first: () => ({ json }), all: () => [{ json }] }, { resumeUrl: `${BASE}/webhook-waiting/123` });
}

const SLACK = 'https://hooks.slack.com/services/T000/B000/xyz';
const departments = ['Sales', 'Design', 'Engineering', 'AI & Data', 'Marketing', 'Finance & Legal', '_review', '_log']
  .map((name) => ({ name, handles: `${name} work`, webhook_url: SLACK }));
const normalize = { request_id: 'REQ-1001', received_at: new Date().toISOString(), origin: 'external', status: 'received', requester_name: 'Mei Lin', requester_email: 'mei@bean.example', company: 'Bean & Co', request_type: 'A new project', budget: '$5k–20k', deadline: '2027-03-01', raw_text: 'We run 12 coffee shops and want an order-ahead app @everyone <!channel> see http://evil.example', review_token: 'abc123' };
const ok = (name, cond) => console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}`);

// rule checks
const rc = run('n8n/nodes/rule-checks.js', { Normalize: normalize, 'Count requests': [{ request_id: 'REQ-0999', requester_email: 'mei@bean.example', received_at: new Date(Date.now() - 600e3).toISOString() }], 'Load departments': departments, 'Load rules': [{ rule: 'Public sector → Finance & Legal', agent: 'planner', human_department: 'Finance & Legal', active: true, created_at: '2026-10-17T05:00:00Z' }] })[0].json;
ok('rule checks: duplicate found, no flood, teams exclude system rows', rc.duplicate_of === 'REQ-0999' && !rc.burst && rc.dept_names.length === 6 && rc.verifier_prompt.includes('<request>'));

// verdict + guardrails
const verdict = run('n8n/nodes/record-verdict.js', {}, { json: { output: { status: 'verified', reasons: ['Clear scope'], title: 'Order-ahead app for a coffee chain', summary: 'Coffee chain wants an app.', priority: 'high' } } })[0].json;
ok('verdict: verified', verdict.verified && verdict.title.startsWith('Order-ahead'));
const badVerdict = run('n8n/nodes/record-verdict.js', {}, { json: { output: { status: 'yes please' } } })[0].json;
ok('verdict: unknown status becomes needs_info', badVerdict.verification === 'needs_info' && !badVerdict.verified);
const plannerOut = { primary_department: 'Sales', routing_reason: 'New client', tasks: [
  { step: 1, title: 'Book a discovery call', details: 'Confirm scope', department: 'Sales', effort: 'S', confidence: 0.92 },
  { step: 2, title: 'Design the flow', details: 'Wireframes', department: 'Design', effort: 'M', confidence: 0.86 },
  { step: 3, title: 'Hack the planet', details: '', department: 'Hackers', effort: 'L', confidence: 0.99 } ] };
const guard = run('n8n/nodes/guardrails.js', { Normalize: normalize, 'Rule checks': rc }, { json: { output: plannerOut } })[0].json;
ok('guardrails: external + high value + unknown team → review', guard.lane === 'review' && guard.review_reasons.length >= 3 && guard.tasks[2].confidence === 0);
const staffGuard = run('n8n/nodes/guardrails.js', { Normalize: { ...normalize, origin: 'internal', budget: '', deadline: '' }, 'Rule checks': rc }, { json: { output: { ...plannerOut, tasks: plannerOut.tasks.slice(0, 1) } } })[0].json;
ok('guardrails: clear staff task → auto', staffGuard.lane === 'auto');

// review card (Slack)
const nodes = { Normalize: normalize, 'Rule checks': rc, 'Record verdict': verdict, Guardrails: guard, 'Load departments': departments };
const card = run('n8n/nodes/review-card.js', nodes, { kind: 'plan', libs: [MSG] })[0].json;
const cardText = JSON.stringify(card.body);
ok('plan card: Slack format, link has token, untrusted text escaped/defanged', card.has_channel && card.body.attachments && card.review_link.includes('t=abc123') && !cardText.includes('<!channel>') && cardText.includes('hxxp://'));
const flagged = run('n8n/nodes/review-card.js', { ...nodes, 'Record verdict': { ...verdict, verified: false, verification: 'suspicious', verification_reasons: 'Asks for credentials', questions: [] } }, { kind: 'flagged', libs: [MSG] })[0].json;
ok('flagged card: no empty sections', !JSON.stringify(flagged.body).includes('"text":""') && JSON.parse(flagged.review_json).kind === 'flagged');

// decisions
const dec = run('n8n/nodes/apply-decision.js', nodes, { json: { body: { decision: 'change', owner: 'Finance & Legal', why: 'Public sector goes to F&L first', save_rule: 'yes', reviewer: 'Ayesha' } } })[0].json;
ok('decision: change owner + save rule', dec.final_department === 'Finance & Legal' && dec.save_rule && dec.status === 'approved');
const expired = run('n8n/nodes/apply-decision.js', nodes, { json: {} })[0].json;
ok('decision: silence → expired, never approved', expired.status === 'expired' && !expired.approved);
const rule = run('n8n/nodes/rule-to-save.js', { ...nodes, 'Apply decision': dec }, { kind: 'plan' });
ok('rule to save: one planner rule row', rule.length === 1 && rule[0].json.agent === 'planner' && rule[0].json.human_department === 'Finance & Legal');
ok('rule to save: nothing when not asked', run('n8n/nodes/rule-to-save.js', { ...nodes, 'Apply decision': { ...dec, save_rule: false } }, { kind: 'plan' }).length === 0);

// assignment + messages
const withDec = { ...nodes, 'Apply decision': dec };
const tasks = run('n8n/nodes/save-tasks.js', withDec);
ok('save tasks: one row per task', tasks.length === 3);
const team = run('n8n/nodes/team-messages.js', withDec, { libs: [MSG] });
ok('team messages: owner brief for Finance & Legal + task cards', team.some((i) => JSON.stringify(i.json.body).includes('You own REQ-1001')) && team.length >= 3);
const log = run('n8n/nodes/log-message.js', { ...withDec, 'Mark assigned': {} }, { libs: [MSG] });
ok('log: corrected line uses strike-through', log.length === 1 && JSON.stringify(log[0].json.body).includes('~Sales~'));
const discordLog = run('n8n/nodes/log-message.js', { ...withDec, 'Mark assigned': {}, 'Load departments': departments.map((d) => ({ ...d, webhook_url: 'https://discord.com/api/webhooks/1/x' })) }, { libs: [MSG] });
ok('log: Discord format when the link is Discord', discordLog[0].json.body.embeds && discordLog[0].json.body.allowed_mentions.parse.length === 0);

// pages
const row = { ...normalize, ...verdict, status: 'awaiting_review', review_json: card.review_json, verification_reasons: 'Clear scope' };
const page = run('ui/review-page.n8n.js', { 'Review link': { query: { id: 'REQ-1001', t: 'abc123' } }, 'Get request': [row], 'Load departments': departments }, { libs: [PAGE] })[0].json.html;
writeFileSync(join(here, 'out', 'review-plan.html'), page);
ok('review page: form posts decision, no raw <script>, request text escaped', page.includes('name="decision"') && page.includes('review-submit') && !page.includes('<!channel>'));
const fpage = run('ui/review-page.n8n.js', { 'Review link': { query: { id: 'REQ-1001', t: 'abc123' } }, 'Get request': [{ ...row, review_json: flagged.review_json }], 'Load departments': departments }, { libs: [PAGE] })[0].json.html;
writeFileSync(join(here, 'out', 'review-flagged.html'), fpage);
const badToken = run('ui/review-page.n8n.js', { 'Review link': { query: { id: 'REQ-1001', t: 'wrong' } }, 'Get request': [row], 'Load departments': departments }, { libs: [PAGE] })[0].json.html;
ok('review page: wrong token is refused', badToken.includes("isn't valid"));
const submit = run('ui/review-submit.n8n.js', { 'Decision submitted': { body: { id: 'REQ-1001', t: 'abc123', decision: 'change', owner: 'Finance & Legal', why: 'Public sector', save_rule: 'yes', reviewer: 'Ayesha' } }, 'Get request': [{ ...row, resume_url: `${BASE}/webhook-waiting/123` }] }, { libs: [PAGE] })[0].json;
writeFileSync(join(here, 'out', 'review-done.html'), submit.html);
ok('submit: valid → resumes locally with the decision', submit.ok && submit.resume === 'http://127.0.0.1:5678/webhook-waiting/123' && submit.payload.reviewer === 'Ayesha');
const inbox = run('ui/inbox.n8n.js', { 'Get waiting': [row] }, { libs: [PAGE] })[0].json.html;
writeFileSync(join(here, 'out', 'inbox.html'), inbox);
ok('inbox: lists the waiting request with its review link', inbox.includes('REQ-1001') && inbox.includes('t=abc123'));
const rows = run('n8n/nodes/connect-rows.js', {}, { json: { sales: SLACK, design: 'not a url', review: 'https://discord.com/api/webhooks/1/x' } });
ok('connect: keeps only valid Slack/Discord links', rows.length === 2);
