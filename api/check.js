// Placeholder del checker de alertas (para notificaciones con la app cerrada).
// Por ahora solo responde OK. Más adelante se puede implementar el análisis
// periódico de los activos vigilados (stars) de cada usuario.
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.json({
    ok: true,
    message: 'Checker listo. Las notificaciones de prueba ya funcionan con /api/test. El chequeo automático de zonas se puede ampliar después.',
    time: new Date().toISOString()
  });
};
