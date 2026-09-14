/**
 * Vercel Serverless Function: POST /api/subscribe
 *
 * Vercel routes any file under /api to a serverless function automatically —
 * it does not run server/server.js (which needs a long-lived process via
 * app.listen(), the way Render/Railway/a VPS work). This file is the
 * Vercel-native equivalent of that same endpoint, calling Kit's V4 API the
 * same way. See server/README.md for the full "why keep the key server-side"
 * background — it applies here too.
 *
 * Configure these as Environment Variables in the Vercel project settings
 * (Project → Settings → Environment Variables), NOT via a committed .env
 * file — Vercel doesn't read server/.env in production:
 *   KIT_API_KEY  (required)
 *   KIT_FORM_ID  (optional)
 *   KIT_TAG_ID   (optional)
 * Redeploy after adding/changing them.
 */

const KIT_API_BASE = "https://api.kit.com/v4";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function kitRequest(pathname, body, apiKey) {
  const res = await fetch(`${KIT_API_BASE}${pathname}`, {
    method: "POST",
    headers: {
      "X-Kit-Api-Key": apiKey,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const KIT_API_KEY = process.env.KIT_API_KEY || "";
    const KIT_FORM_ID = process.env.KIT_FORM_ID || "";
    const KIT_TAG_ID = process.env.KIT_TAG_ID || "";

    const body = req.body || {};
    const email = String(body.email || "").trim();
    const consent = !!body.consent;

    if (!EMAIL_RE.test(email)) {
      return res.status(400).json({ error: "Please provide a valid email address." });
    }
    if (!consent) {
      return res.status(400).json({ error: "Consent is required." });
    }
    if (!KIT_API_KEY) {
      return res.status(500).json({ error: "The server isn't configured with a Kit API key yet." });
    }

    // Create (or update, if they already exist) the subscriber in Kit.
    const created = await kitRequest("/subscribers", { email_address: email, state: "active" }, KIT_API_KEY);
    if (!created.ok) {
      console.error("[zippr] Kit create-subscriber failed:", created.status, created.data);
      return res.status(502).json({ error: "Kit rejected the request. Please try again shortly." });
    }

    // Optionally enroll them in a specific form (e.g. a waitlist sequence).
    if (KIT_FORM_ID) {
      const formResult = await kitRequest(`/forms/${KIT_FORM_ID}/subscribers`, { email_address: email }, KIT_API_KEY);
      if (!formResult.ok) {
        console.error("[zippr] Kit add-to-form failed:", formResult.status, formResult.data);
        // Don't fail the request — the subscriber was created either way.
      }
    }

    // Optionally tag them for segmentation.
    if (KIT_TAG_ID) {
      const tagResult = await kitRequest(`/tags/${KIT_TAG_ID}/subscribers`, { email_address: email }, KIT_API_KEY);
      if (!tagResult.ok) {
        console.error("[zippr] Kit tag failed:", tagResult.status, tagResult.data);
      }
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("[zippr] /api/subscribe error:", err);
    return res.status(500).json({ error: "Something went wrong. Please try again." });
  }
};
