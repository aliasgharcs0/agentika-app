// ---- Apprentice message kit (prepended to every Code node that posts a message) ----
// One message design → Slack (Block Kit, colored card) or Discord (embed), chosen from the webhook URL.
const IS_SLACK = (u) => /^https:\/\/hooks\.slack\.com\//.test(String(u || ''));
const IS_DISCORD = (u) => /^https:\/\/(discord|discordapp)\.com\/api\/webhooks\//.test(String(u || ''));
// Clouds by Alternate Futures palette: Brand Blue for actions and human decisions, Dark Blue for ownership,
// Apricot for 'waiting for a manager', Terracotta only for alerts.
const COLORS = { ok: '#000AFF', human: '#000AFF', ink: '#0000AF', wait: '#FFC7AA', alert: '#BE4200', muted: '#9A968E' };
const TYPE_TITLES = {
  'A new project': 'New project', 'Support for existing work': 'Support request', 'Something else': 'Request', 'Internal task': 'Internal task',
};
const clip = (s, n) => { const t = String(s ?? '').trim(); return t.length > n ? t.slice(0, n - 1) + '…' : t; };

// Text from requesters (or written by the model from it) is untrusted:
// no pings, no markup tricks, no clickable links.
function untrusted(s, n, slack) {
  const t = clip(s, n).replace(/(h)ttp(s?):\/\//gi, '$1xxp$2://');
  return slack
    ? t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    : t.replace(/([\\*_~`|>#[\]()])/g, '\\$1').replace(/@/g, '@\u200b');
}

// build(f, u) returns { title, color, lead, fields: [[name, value]], sections: [{ heading, lines }],
//   quote: { label, text }, button: { text, url }, footer }. f = trusted formatting, u = untrusted text.
function render(url, build) {
  const slack = IS_SLACK(url);
  const f = slack
    ? { b: (x) => `*${x}*`, s: (x) => `~${x}~` }
    : { b: (x) => `**${x}**`, s: (x) => `~~${x}~~` };
  const u = (s, n) => untrusted(s, n, slack);
  const m = build(f, u);
  const sections = (m.sections || []).filter((sec) => sec.lines && sec.lines.filter(Boolean).length);
  const quoteText = m.quote ? m.quote.text.split('\n').filter((l) => l.trim()).slice(0, 8).map((l) => `> ${l}`).join('\n') : '';
  if (slack) {
    const blocks = [];
    if (m.lead) blocks.push({ type: 'section', text: { type: 'mrkdwn', text: clip(m.lead, 2900) } });
    if (m.fields && m.fields.length) blocks.push({ type: 'section', fields: m.fields.slice(0, 10).map(([k, v]) => ({ type: 'mrkdwn', text: clip(`*${k}*\n${v || '–'}`, 1990) })) });
    for (const sec of sections) blocks.push({ type: 'section', text: { type: 'mrkdwn', text: clip(`${sec.heading ? `*${sec.heading}*\n` : ''}${sec.lines.filter(Boolean).join('\n')}`, 2900) } });
    if (quoteText) blocks.push({ type: 'section', text: { type: 'mrkdwn', text: clip(`*${m.quote.label}*\n${quoteText}`, 2900) } });
    if (m.button) blocks.push({ type: 'actions', elements: [{ type: 'button', text: { type: 'plain_text', text: clip(m.button.text, 70) }, url: m.button.url, style: 'primary' }] });
    if (m.footer) blocks.push({ type: 'context', elements: [{ type: 'mrkdwn', text: clip(m.footer, 290) }] });
    const body = { text: `*${clip(m.title, 150)}*` };
    if (blocks.length) body.attachments = [{ color: COLORS[m.color] || COLORS.ink, blocks }];
    return body;
  }
  const description = [
    m.lead,
    ...sections.map((sec) => `${sec.heading ? `**${sec.heading}**\n` : ''}${sec.lines.filter(Boolean).join('\n')}`),
    quoteText ? `**${m.quote.label}**\n${quoteText}` : '',
    m.button ? `[${m.button.text} →](${m.button.url})` : '',
  ].filter(Boolean).join('\n\n');
  const embed = { title: clip(m.title, 250), color: parseInt((COLORS[m.color] || COLORS.ink).slice(1), 16), timestamp: new Date().toISOString() };
  if (description) embed.description = clip(description, 4000); // Discord rejects empty descriptions
  if (m.fields && m.fields.length) embed.fields = m.fields.slice(0, 10).map(([k, v]) => ({ name: clip(k, 250), value: clip(v || '–', 1000), inline: true }));
  if (m.footer) embed.footer = { text: clip(m.footer, 200) };
  return { username: 'Apprentice', allowed_mentions: { parse: [] }, embeds: [embed] };
}

// The webhook for a team or system channel (rows named "_review" and "_log"), from the departments table.
function hookOf(name) {
  try {
    const d = $('Load departments').all().map((i) => i.json).find((x) => x.name === name);
    return d && (IS_SLACK(d.webhook_url) || IS_DISCORD(d.webhook_url)) ? d.webhook_url : null;
  } catch (e) { return null; }
}
const get = (node) => { try { return $(node).first().json; } catch (e) { return null; } };
// ---- end of message kit ----
