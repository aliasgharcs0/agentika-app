// Renders board.n8n.js locally with sample data, exactly as the n8n Code node would.
// Usage: node product/ui/preview/render-preview.mjs  →  writes board-preview.html and board-empty.html here.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const code = readFileSync(join(here, '..', 'board.n8n.js'), 'utf8');
const ago = (minutes) => new Date(Date.now() - minutes * 60_000).toISOString();

const sample = {
  'Get requests': [
    { request_id: 'REQ-1042', received_at: ago(1), requester_name: 'Zara Hussain', origin: 'external', request_type: 'Support', status: 'received' },
    { request_id: 'REQ-1041', received_at: ago(4), requester_name: 'Hina Malik', origin: 'external', request_type: 'New project / lead', title: 'Online store for a fashion label', status: 'awaiting_review', lane: 'review', ai_department: 'Sales' },
    { request_id: 'REQ-1040', received_at: ago(9), requester_name: 'Daniel Brooks', origin: 'external', request_type: 'New project / lead', title: 'Hospital bed-availability dashboard', status: 'assigned', lane: 'review', ai_department: 'Finance & Legal', final_department: 'Finance & Legal', reviewer: 'Ayesha' },
    { request_id: 'REQ-1039', received_at: ago(18), requester_name: 'Omar Farooq', origin: 'external', request_type: 'New project / lead', title: 'Sports-field booking site for a city council', status: 'assigned', lane: 'review', ai_department: 'Sales', final_department: 'Finance & Legal', reviewer: 'Ayesha' },
    { request_id: 'REQ-1038', received_at: ago(26), requester_name: 'Sara Khan', origin: 'internal', request_type: 'Internal task', title: 'Fix the footer contact form', status: 'assigned', lane: 'auto', ai_department: 'Engineering', final_department: 'Engineering' },
    { request_id: 'REQ-1037', received_at: ago(31), requester_name: 'Max', origin: 'external', request_type: 'Other', title: 'Unsolicited SEO offer', status: 'rejected', lane: 'review', reviewer: 'Ayesha' },
    { request_id: 'REQ-1036', received_at: ago(40), requester_name: 'Ahmed', origin: 'external', request_type: 'New project / lead', title: 'Vague AI enquiry', status: 'needs_info' },
    { request_id: 'REQ-1035', received_at: ago(52), requester_name: 'Mei Lin', origin: 'external', request_type: 'New project / lead', title: 'Order-ahead app for a coffee chain', status: 'assigned', lane: 'review', ai_department: 'Sales', final_department: 'Sales', reviewer: 'Ayesha' },
  ],
  'Get tasks': [
    ...['Sales', 'Finance & Legal', 'Design', 'Engineering', 'Marketing'].map((department) => ({ request_id: 'REQ-1035', department })),
    ...['Finance & Legal', 'Sales', 'Design', 'Engineering'].map((department) => ({ request_id: 'REQ-1039', department })),
    ...['Finance & Legal', 'AI & Data', 'Design'].map((department) => ({ request_id: 'REQ-1040', department })),
    { request_id: 'REQ-1038', department: 'Engineering' },
  ],
  'Get rules': [
    { created_at: ago(17), created_by: 'Ayesha', agent: 'planner', ai_department: 'Sales', human_department: 'Finance & Legal', rule: 'Government and public-sector clients go to Finance & Legal first because of tender and compliance rules.', active: true },
    { created_at: ago(140), created_by: 'Ayesha', agent: 'planner', ai_department: 'Marketing', human_department: 'Engineering', rule: 'Anything that mentions Shopify goes to Engineering, not Marketing.', active: true },
  ],
};

const run = (data) => {
  const $ = (name) => ({ all: () => (data[name] || []).map((json) => ({ json })) });
  return new Function('$', code)($)[0].json.html; // the Code node body ends with a top-level `return`
};

writeFileSync(join(here, 'board-preview.html'), run(sample));
writeFileSync(join(here, 'board-empty.html'), run({}));
console.log('wrote board-preview.html and board-empty.html');
