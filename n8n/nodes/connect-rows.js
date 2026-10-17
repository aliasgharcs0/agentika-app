// "Connect your channels" form → one row per valid channel link that was filled in.
const f = $input.first().json;
const MAP = {
  sales: 'Sales', design: 'Design', engineering: 'Engineering', ai_data: 'AI & Data',
  marketing: 'Marketing', finance_legal: 'Finance & Legal', review: '_review', log: '_log',
};
const valid = (u) => /^https:\/\/hooks\.slack\.com\/services\//.test(u) || /^https:\/\/(discord|discordapp)\.com\/api\/webhooks\//.test(u);
const rows = [];
for (const [field, name] of Object.entries(MAP)) {
  const url = String(f[field] || '').trim();
  if (url && valid(url)) rows.push({ json: { name, webhook_url: url } });
}
return rows;
