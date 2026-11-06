// Manda una notificación de prueba al teléfono que la pide (para probar los avisos con la app cerrada).
const crypto = require('crypto');
const webpush = require('web-push');
const { rd } = require('./_lib');

module.exports = async (req, res) => {
  try {
    const ep = (req.body || {}).endpoint;
    if (req.method !== 'POST' || !ep) return res.status(400).json({ error: 'falta el endpoint' });
    const id = crypto.createHash('sha1').update(ep).digest('hex');
    const raw = await rd('GET', 'u:' + id);
    if (!raw) return res.status(404).json({ error: 'este teléfono no está registrado: activá los avisos primero' });
    if (!(await rd('SET', 't:' + id, '1', 'NX', 'EX', '20'))) return res.status(429).json({ error: 'esperá unos segundos entre pruebas' });
    const u = JSON.parse(raw);
    webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:admin@example.com', process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);
    const d = Math.min(Math.max(+req.body.delay || 0, 0), 25);
    if (d) await new Promise(r => setTimeout(r, d * 1000));
    const w = u.profile && u.profile.name ? u.profile.name + ', ' : '';
    await webpush.sendNotification(u.sub, JSON.stringify({ title: '🔔 Prueba del servidor', body: w + 'así te llega un aviso con la app cerrada. ¡Funciona!', tag: 'test-' + Date.now() }), { TTL: 60 });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: String(e.message || e) }); }
};
