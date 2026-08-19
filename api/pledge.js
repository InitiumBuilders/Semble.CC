/* Semble compute — pledge capture. No payment rails: a pledge is a signal,
   recorded and counted. GET -> {total, count}. POST {name, contact?, scus}. */
const B = 'https://blob.vercel-storage.com';
const TOK = process.env.BLOB_READ_WRITE_TOKEN;
const PATH = 'semble/pledges.json';

function send(res, code, obj){
  res.statusCode = code;
  res.setHeader('content-type', 'application/json');
  res.setHeader('access-control-allow-origin', '*');
  res.setHeader('access-control-allow-headers', 'content-type');
  res.setHeader('cache-control', 'no-store');
  res.end(JSON.stringify(obj));
}
async function putJson(obj){
  const r = await fetch(B + '/' + PATH, {
    method: 'PUT',
    headers: {
      authorization: 'Bearer ' + TOK, 'x-api-version': '7',
      'x-content-type': 'application/json',
      'x-add-random-suffix': '0', 'x-allow-overwrite': '1',
      'x-cache-control-max-age': '60'
    },
    body: JSON.stringify(obj)
  });
  if (!r.ok) throw new Error('put ' + r.status);
}
async function getJson(){
  const l = await fetch(B + '?prefix=' + encodeURIComponent(PATH) + '&limit=1', {
    headers: { authorization: 'Bearer ' + TOK, 'x-api-version': '7' }
  });
  if (!l.ok) throw new Error('list ' + l.status);
  const j = await l.json();
  const hit = (j.blobs || []).find(b => b.pathname === PATH);
  if (!hit) return { pledges: [] };
  const g = await fetch(hit.url + '?t=' + Date.now(), { cache: 'no-store' });
  return g.ok ? g.json() : { pledges: [] };
}
const clean = (s, n) => String(s == null ? '' : s).replace(/[<>]/g, '').trim().slice(0, n);

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') return send(res, 204, {});
  if (!TOK) return send(res, 503, { error: 'store not connected yet', total: 0, count: 0 });
  try {
    const data = await getJson();
    const total = data.pledges.reduce((a, p) => a + p.scus, 0);
    if (req.method === 'GET')
      return send(res, 200, { total, count: data.pledges.length });
    if (req.method !== 'POST') return send(res, 405, { error: 'method' });
    const body = typeof req.body === 'object' && req.body ? req.body
      : JSON.parse(await new Promise(ok => { let d = ''; req.on('data', c => d += c); req.on('end', () => ok(d || '{}')); }));
    const name = clean(body.name, 40), contact = clean(body.contact, 80);
    const scus = Math.max(1, Math.min(10000, parseInt(body.scus, 10) || 0));
    if (!name || !scus) return send(res, 400, { error: 'missing fields' });
    data.pledges.push({ name, contact, scus, at: Date.now() });
    await putJson(data);
    return send(res, 200, { total: total + scus, count: data.pledges.length });
  } catch (e) {
    return send(res, 500, { error: 'store error' });
  }
};
