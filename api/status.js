// GET /api/status?status_url=...&response_url=...
// İş bittiyse { done: true, image: "https://..." }, bitmediyse { done: false, status }

const ALLOWED = "https://queue.fal.run/";

function pickImage(d) {
  if (!d) return null;
  if (d.image?.url) return d.image.url;
  if (Array.isArray(d.images) && d.images[0]) return d.images[0].url || d.images[0];
  if (Array.isArray(d.output) && d.output[0]) return d.output[0];
  return null;
}

export default async function handler(req, res) {
  const key = process.env.FAL_KEY;
  if (!key) return res.status(500).json({ error: "Sunucuda FAL_KEY tanımlı değil." });

  const { status_url, response_url } = req.query || {};
  // Anahtarımızın başka bir adrese gönderilmesini engelle
  if (![status_url, response_url].every((u) => typeof u === "string" && u.startsWith(ALLOWED))) {
    return res.status(400).json({ error: "Geçersiz adres." });
  }
  const headers = { Authorization: `Key ${key}` };

  try {
    const s = await fetch(status_url, { headers });
    const sd = await s.json().catch(() => ({}));
    if (!s.ok) return res.status(502).json({ error: sd.detail || `Durum alınamadı (${s.status})` });

    if (sd.status !== "COMPLETED") {
      return res.status(200).json({ done: false, status: sd.status, position: sd.queue_position });
    }

    const r = await fetch(response_url, { headers });
    const rd = await r.json().catch(() => ({}));
    if (!r.ok) {
      const msg = Array.isArray(rd.detail) ? rd.detail.map((x) => x.msg).join(", ") : rd.detail;
      return res.status(502).json({ error: msg || `Sonuç alınamadı (${r.status})` });
    }
    const image = pickImage(rd);
    if (!image) return res.status(502).json({ error: "Model görsel döndürmedi." });
    return res.status(200).json({ done: true, image });
  } catch (e) {
    return res.status(500).json({ error: "Durum sorgulanamadı: " + e.message });
  }
}
