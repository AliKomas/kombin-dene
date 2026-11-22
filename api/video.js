// POST /api/video  ->  kombin görselinden 5 saniyelik 360° dönüş videosu üretir (~0,35 $).
// Gövde: { image, code }   image: fal'in döndürdüğü https:// sonuç adresi

const MODEL = "fal-ai/kling-video/v2.5-turbo/pro/image-to-video";

const PROMPT =
  "Fashion lookbook video. The person slowly turns around in place a full 360 degrees, " +
  "showing the outfit from the front, the side, the back and the other side, then faces the camera again. " +
  "Static camera, full body in frame, soft studio light, smooth natural motion. " +
  "The person's face and every piece of clothing stay exactly the same throughout.";

const NEGATIVE =
  "blur, distortion, warped body, extra limbs, changing clothes, changing face, camera shake, text, low quality";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Yalnızca POST" });

  const key = process.env.FAL_KEY;
  if (!key) return res.status(500).json({ error: "Sunucuda FAL_KEY tanımlı değil." });

  const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
  const { image, code = "" } = body;

  if (process.env.ACCESS_CODE && code !== process.env.ACCESS_CODE) {
    return res.status(401).json({ error: "Giriş kodu hatalı." });
  }
  if (typeof image !== "string" || !/^https:\/\/\S+$/.test(image) || image.length > 2000) {
    return res.status(400).json({ error: "Görsel adresi geçersiz." });
  }

  try {
    const r = await fetch(`https://queue.fal.run/${MODEL}`, {
      method: "POST",
      headers: { Authorization: `Key ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: PROMPT,
        image_url: image,
        duration: "5",
        negative_prompt: NEGATIVE,
        cfg_scale: 0.5,
      }),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      return res.status(502).json({ error: data.detail || data.error || `fal.ai hatası (${r.status})` });
    }
    return res.status(200).json({ status_url: data.status_url, response_url: data.response_url });
  } catch (e) {
    return res.status(500).json({ error: "Video isteği gönderilemedi: " + e.message });
  }
}
