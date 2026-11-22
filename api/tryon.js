// POST /api/tryon  ->  kişi fotoğrafı + 1..5 kıyafet parçasını tek kombin olarak giydirir.
// Gövde: { person, garments: [{ image, type }], code }
//   person / image : https:// adresi veya data:image/...;base64,...
//   type           : "ust" | "alt" | "elbise" | "dis" | "ayakkabi" | "aksesuar"

const MODEL = "fal-ai/nano-banana/edit"; // Google Gemini görsel düzenleme, birden çok görseli birlikte kullanır

const TYPES = {
  ust: "top (shirt / t-shirt / sweater / blouse)",
  alt: "bottom (trousers / jeans / skirt / shorts)",
  elbise: "one-piece (dress / jumpsuit)",
  dis: "outerwear (jacket / coat / blazer), worn over the other clothes",
  ayakkabi: "shoes",
  aksesuar: "accessory (bag / hat / belt / scarf / jewellery)",
};

const MAX_IMAGE_CHARS = 1_500_000;
const MAX_PIECES = 5;

function validImage(v) {
  if (typeof v !== "string" || v.length > MAX_IMAGE_CHARS) return false;
  return /^data:image\/(jpeg|png|webp);base64,/.test(v) || /^https:\/\/\S+$/.test(v);
}

function buildPrompt(garments) {
  const list = garments
    .map((g, i) => `- Image ${i + 2}: ${TYPES[g.type] || "clothing item"}`)
    .join("\n");
  const needsFullBody = garments.some((g) => ["alt", "elbise", "ayakkabi"].includes(g.type));
  return [
    "Virtual try-on. Image 1 is a photo of a real person. The other images are product photos of clothing items:",
    list,
    "",
    "Create ONE photorealistic fashion photo of the exact same person from image 1 wearing ALL of these items together as a single outfit.",
    "Keep the person's identity identical: same face, hair, skin tone, body shape and proportions.",
    "Copy every item faithfully: exact colour, pattern, print, logo, fabric texture, length and cut. Do not invent new items or change their design.",
    "Replace the person's original clothes with these items. Where an item is not provided, keep the original clothing simple and neutral.",
    needsFullBody
      ? "Show the full body from head to toe, standing, facing the camera, so the whole outfit including shoes is visible."
      : "Frame the person so the whole outfit is clearly visible, facing the camera.",
    "Clean, softly lit, neutral studio background. Only one person in the image. No text, no product cut-outs, no collage.",
  ].join("\n");
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Yalnızca POST" });

  const key = process.env.FAL_KEY;
  if (!key) return res.status(500).json({ error: "Sunucuda FAL_KEY tanımlı değil." });

  const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
  const { person, garments, code = "" } = body;

  if (process.env.ACCESS_CODE && code !== process.env.ACCESS_CODE) {
    return res.status(401).json({ error: "Giriş kodu hatalı." });
  }
  if (!validImage(person)) return res.status(400).json({ error: "Kişi fotoğrafı geçersiz." });
  if (!Array.isArray(garments) || garments.length < 1) {
    return res.status(400).json({ error: "En az bir kıyafet ekle." });
  }
  if (garments.length > MAX_PIECES) {
    return res.status(400).json({ error: `En fazla ${MAX_PIECES} parça eklenebilir.` });
  }
  if (!garments.every((g) => g && validImage(g.image) && TYPES[g.type])) {
    return res.status(400).json({ error: "Kıyafet görsellerinden biri geçersiz." });
  }

  try {
    const r = await fetch(`https://queue.fal.run/${MODEL}`, {
      method: "POST",
      headers: { Authorization: `Key ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: buildPrompt(garments),
        image_urls: [person, ...garments.map((g) => g.image)],
        num_images: 1,
        aspect_ratio: "3:4",
        output_format: "jpeg",
      }),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      return res.status(502).json({ error: data.detail || data.error || `fal.ai hatası (${r.status})` });
    }
    return res.status(200).json({ status_url: data.status_url, response_url: data.response_url });
  } catch (e) {
    return res.status(500).json({ error: "İstek gönderilemedi: " + e.message });
  }
}
