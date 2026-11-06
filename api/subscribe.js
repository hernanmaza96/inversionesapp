// Guarda la suscripción push + perfil + estrellas + config del usuario en Upstash Redis.
// GET: devuelve la VAPID public key para que el cliente se suscriba.
// POST: registra o actualiza el usuario.
const crypto = require('crypto');
const { rd } = require('./_lib');

module.exports = async (req, res) => {
  // CORS básico
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    // GET → devolver la clave pública VAPID
    if (req.method === 'GET') {
      const key = process.env.VAPID_PUBLIC_KEY;
      if (!key) return res.status(500).json({ error: 'Falta VAPID_PUBLIC_KEY en las variables de entorno de Vercel' });
      return res.json({ key });
    }

    // POST → guardar suscripción
    if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

    const body = req.body || {};
    const sub = body.sub;
    if (!sub || !sub.endpoint) return res.status(400).json({ error: 'falta sub.endpoint' });

    const id = crypto.createHash('sha1').update(sub.endpoint).digest('hex');
    const data = {
      sub,
      profile: body.profile || {},
      stars: Array.isArray(body.stars) ? body.stars : [],
      cfg: body.cfg || {},
      avg: body.avg || {},
      updated: Date.now()
    };

    // Guardar usuario y añadirlo al set de usuarios activos
    await rd('SET', 'u:' + id, JSON.stringify(data));
    await rd('SADD', 'users', id);

    return res.json({ ok: true, id });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: String(e.message || e) });
  }
};
