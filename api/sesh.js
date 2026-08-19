/* Semble — the first real loop. One function: create · commit · read.
   Store: Vercel Blob (JSON per Sesh). No accounts; the link is the identity;
   the creator holds an edit key (only its hash is stored).
   Fails closed: no store token -> honest error, nothing pretends. */
const B = 'https://blob.vercel-storage.com';
const TOK = process.env.BLOB_READ_WRITE_TOKEN;

function send(res, code, obj){
  res.statusCode = code;
  res.setHeader('content-type', 'application/json');
  res.setHeader('access-control-allow-origin', '*');
  res.setHeader('access-control-allow-headers', 'content-type');
  res.setHeader('cache-control', 'no-store');
  res.end(JSON.stringify(obj));
}
function pub(state){
  const { editKeyHash, ...rest } = state;
  rest.certain = state.commits.length >= state.threshold;
  return rest;
}
async function putJson(path, obj){
  const r = await fetch(B + '/' + path, {
    method: 'PUT',
    headers: {
      authorization: 'Bearer ' + TOK,
      'x-api-version': '7',
      'x-content-type': 'application/json',
      'x-add-random-suffix': '0',
      'x-allow-overwrite': '1',
      'x-cache-control-max-age': '60'
    },
    body: JSON.stringify(obj)
  });
  if (!r.ok) throw new Error('put ' + r.status);
  return r.json();
}
async function getJson(path){
  const l = await fetch(B + '?prefix=' + encodeURIComponent(path) + '&limit=1', {
    headers: { authorization: 'Bearer ' + TOK, 'x-api-version': '7' }
  });
  if (!l.ok) throw new Error('list ' + l.status);
  const j = await l.json();
  const hit = (j.blobs || []).find(b => b.pathname === path);
  if (!hit) return null;
  const g = await fetch(hit.url + '?t=' + Date.now(), { cache: 'no-store' });
  if (!g.ok) throw new Error('get ' + g.status);
  return g.json();
}
const clean = (s, n) => String(s == null ? '' : s).replace(/[<>]/g, '').trim().slice(0, n);

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') return send(res, 204, {});
  if (!TOK) return send(res, 503, { error: 'store not connected yet' });
  try {
    if (req.method === 'GET') {
      const id = clean((req.query && req.query.id) || '', 40);
      if (!/^[a-z0-9-]{6,40}$/.test(id)) return send(res, 400, { error: 'bad id' });
      const state = await getJson('semble/sesh/' + id + '.json');
      if (!state) return send(res, 404, { error: 'no such sesh' });
      return send(res, 200, pub(state));
    }
    if (req.method !== 'POST') return send(res, 405, { error: 'method' });
    const body = typeof req.body === 'object' && req.body ? req.body
      : JSON.parse(await new Promise(ok => { let d = ''; req.on('data', c => d += c); req.on('end', () => ok(d || '{}')); }));
    const { createHash, randomBytes } = require('crypto');

    if (body.action === 'create') {
      const what = clean(body.what, 90), where = clean(body.where, 90);
      const when = clean(body.when, 40), host = clean(body.name, 40);
      const model = clean(body.model, 30) || 'Coordination Call';
      const threshold = Math.max(2, Math.min(50, parseInt(body.threshold, 10) || 0));
      if (!what || !where || !when || !host || !threshold)
        return send(res, 400, { error: 'missing fields' });
      const id = what.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 24)
        + '-' + randomBytes(3).toString('hex');
      const editKey = randomBytes(12).toString('hex');
      const state = {
        id, what, where, when, model, host, threshold,
        editKeyHash: createHash('sha256').update(editKey).digest('hex'),
        commits: [{ name: host, at: Date.now() }],
        v: 1, createdAt: Date.now()
      };
      await putJson('semble/sesh/' + id + '.json', state);
      return send(res, 200, { id, editKey, state: pub(state) });
    }

    if (body.action === 'commit') {
      const id = clean(body.id, 40), name = clean(body.name, 40);
      if (!/^[a-z0-9-]{6,40}$/.test(id) || !name) return send(res, 400, { error: 'missing fields' });
      const state = await getJson('semble/sesh/' + id + '.json');
      if (!state) return send(res, 404, { error: 'no such sesh' });
      if (state.commits.length >= 50) return send(res, 409, { error: 'full' });
      if (state.commits.some(c => c.name.toLowerCase() === name.toLowerCase()))
        return send(res, 200, pub(state));   /* idempotent: same name = same seat */
      state.commits.push({ name, at: Date.now() });
      state.v++;
      await putJson('semble/sesh/' + id + '.json', state);
      return send(res, 200, pub(state));
    }
    return send(res, 400, { error: 'unknown action' });
  } catch (e) {
    return send(res, 500, { error: 'store error' });
  }
};
