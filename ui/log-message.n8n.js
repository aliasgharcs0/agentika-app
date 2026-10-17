// Apprentice · one line in #apprentice-log for every finished request
// n8n Code node · "Run Once for All Items" · put it after the Data Table update that ends each path
// (its input is the updated request row). Then an HTTP Request node exactly like the team messages.
// The log channel's webhook is the departments-table row named "_log" (rows starting with "_" are
// system channels: Build context and the team messages skip them).
// "Load departments" must run on every path, so place it right after Normalize.

const row = $input.first().json;
const logRow = $('Load departments').all().map((i) => i.json).find((d) => d.name === '_log');
if (!logRow || !logRow.discord_webhook) throw new Error('Add a departments row named "_log" with the #apprentice-log webhook URL');

const safe = (s, n) => { const t = String(s ?? '').trim().replace(/@/g, '@​'); return t.length > n ? t.slice(0, n - 1) + '…' : t; };
const who = safe(row.reviewer || 'a manager', 40);
const ai = safe(row.ai_department, 40);
const fin = safe(row.final_department || row.ai_department, 40);

const OUTCOMES = {
  assigned: row.lane === 'auto'
    ? [0x2f6b4f, `**${fin}** · assigned automatically`]
    : row.final_department && row.ai_department && row.final_department !== row.ai_department
      ? [0xc8361e, `~~${ai}~~ → **${fin}** · corrected by ${who}`]
      : [0x2f6b4f, `**${fin}** · approved by ${who}`],
  rejected: [0x6e6a60, `Declined by ${who}`],
  expired: [0x8f610a, 'No decision within 4 hours. Not assigned; a reminder was sent'],
  needs_info: [0x8f610a, `Waiting for more detail${row.reviewer ? `, asked by ${who}` : ''}`],
  error: [0xc8361e, `Failed: ${safe(row.error || 'see the execution log', 200)}`],
};
const [color, line] = OUTCOMES[row.status] || [0x6e6a60, safe(row.status || 'updated', 40)];

return [{
  json: {
    url: logRow.discord_webhook,
    body: {
      username: 'Apprentice',
      allowed_mentions: { parse: [] },
      embeds: [{ color, title: safe(`${row.request_id} · ${row.title || row.request_type || 'Request'}`, 250), description: line, timestamp: new Date().toISOString() }],
    },
  },
}];
