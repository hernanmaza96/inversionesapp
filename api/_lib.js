// Conexión mínima a Upstash Redis (REST).
// En Vercel: Storage > Upstash Redis crea UPSTASH_REDIS_REST_URL y UPSTASH_REDIS_REST_TOKEN.
// También acepta las variables antiguas de Vercel KV.
const U = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const T = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

async function rd(...cmd) {
  if (!U || !T) {
    throw new Error('Falta configuración de Redis: UPSTASH_REDIS_REST_URL y UPSTASH_REDIS_REST_TOKEN (o KV_*) en las variables de entorno de Vercel');
  }
  const r = await fetch(U, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + T },
    body: JSON.stringify(cmd)
  });
  const j = await r.json();
  if (j.error) throw new Error(j.error);
  return j.result;
}

module.exports = { rd };
