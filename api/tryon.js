// POST /api/tryon  ->  fal.ai kuyruğuna bir sanal deneme işi gönderir.
// Gövde: { person, garment, model, category, code }
//   person / garment : https:// adresi veya data:image/...;base64,... (tarayıcıda küçültülmüş)
//   model            : "kling" | "fashn" | "leffa"
//   category         : "auto" | "tops" | "bottoms" | "one-pieces"
//   code             : ACCESS_CODE tanımlıysa giriş kodu

const MODELS = {
  // Ticari kullanım lisanslı, iyi kalite, ~0.07$/görsel
  kling: {
    id: "fal-ai/kling/v1-5/kolors-virtual-try-on",
    input: (p, g) => ({ human_image_url: p, garment_image_url: g }),
  },
  // Yazı ve desenleri çok iyi korur, ~0.075$/görsel
  fashn: {
    id: "fal-ai/fashn/tryon/v1.6",
    input: (p, g, c) => ({
      model_image: p,
      garment_image: g,
      category: ["tops", "bottoms", "one-pieces"].includes(c) ? c : "auto",
      mode: "balanced",
      garment_photo_type: "auto",
    }),
  },
  // Ticari kullanıma uygun, ~0.10$/görsel
  leffa: {
    id: "fal-ai/leffa/virtual-tryon",
    input: (p, g, c) => ({
      human_image_url: p,
      garment_image_url: g,
      garment_type:
        { bottoms: "lower_body", "one-pieces": "dresses" }[c] || "upper_body",
    }),
  },
};

const MAX_IMAGE_CHARS = 3_000_000; // ~2.2 MB; Vercel gövde sınırı 4.5 MB

function validImage(v) {
  if (typeof v !== "string" || v.length > MAX_IMAGE_CHARS) return false;
  return /^data:image\/(jpeg|png|webp);base64,/.test(v) || /^https:\/\/\S+$/.test(v);
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Yalnızca POST" });

  const key = process.env.FAL_KEY;
  if (!key) return res.status(500).json({ error: "Sunucuda FAL_KEY tanımlı değil." });

  const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
  const { person, garment, model = "kling", category = "auto", code = "" } = body;

  if (process.env.ACCESS_CODE && code !== process.env.ACCESS_CODE) {
    return res.status(401).json({ error: "Giriş kodu hatalı." });
  }
  const m = MODELS[model];
  if (!m) return res.status(400).json({ error: "Bilinmeyen model." });
  if (!validImage(person)) return res.status(400).json({ error: "Kişi fotoğrafı geçersiz." });
  if (!validImage(garment)) return res.status(400).json({ error: "Kıyafet görseli geçersiz." });

  try {
    const r = await fetch(`https://queue.fal.run/${m.id}`, {
      method: "POST",
      headers: { Authorization: `Key ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(m.input(person, garment, category)),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      return res.status(502).json({ error: data.detail || data.error || `fal.ai hatası (${r.status})` });
    }
    // Tarayıcı bu adreslerle /api/status üzerinden durumu sorar
    return res.status(200).json({
      status_url: data.status_url,
      response_url: data.response_url,
    });
  } catch (e) {
    return res.status(500).json({ error: "İstek gönderilemedi: " + e.message });
  }
}
