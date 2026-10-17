// A hello message in every channel that was just connected.
return $('Channel rows').all().map((i) => {
  const { name, webhook_url: url } = i.json;
  const label = name === '_review' ? 'manager reviews' : name === '_log' ? 'the activity log' : `${name} tasks`;
  return { json: { url, body: render(url, (f) => ({
    title: 'Apprentice is connected',
    color: 'ok',
    lead: `This channel will receive ${f.b(label)}.`,
    footer: 'Apprentice · AI sorts the work. People make the call.',
  })) } };
});
