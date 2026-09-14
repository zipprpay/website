/**
 * Zippr site server.
 *
 * Serves the static site (index.html, developers.html, contact.html, assets/)
 * and exposes POST /api/subscribe, which forwards waitlist sign-ups to Kit
 * (kit.com, formerly ConvertKit).
 *
 * The Kit API key is read from the environment (server/.env, gitignored) and
 * is never sent to the browser — see server/README.md for why that matters
 * and how to run this.
 */

require("dotenv").config();

const express = require("express");
const path = require("path");

const app = express();

const PORT = process.env.PORT || 3000;
const KIT_API_KEY = process.env.KIT_API_KEY || "";
const KIT_FORM_ID = process.env.KIT_FORM_ID || ""; // optional
const KIT_TAG_ID = process.env.KIT_TAG_ID || ""; // optional
const KIT_API_BASE = "https://api.kit.com/v4";

if (!KIT_API_KEY) {
  console.warn(
    "[zippr] KIT_API_KEY is not set — copy server/.env.example to server/.env and fill it in. " +
      "/api/subscribe will return an error until it is configured."
  );
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

app.use(express.json());
app.use(express.static(path.join(__dirname, "..")));

async function kitRequest(pathname, body) {
  const res = await fetch(`${KIT_API_BASE}${pathname}`, {
    method: "POST",
    headers: {
      "X-Kit-Api-Key": KIT_API_KEY,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

app.post("/api/subscribe", async (req, res) => {
  try {
    const email = String((req.body && req.body.email) || "").trim();
    const consent = !!(req.body && req.body.consent);

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
    const created = await kitRequest("/subscribers", { email_address: email, state: "active" });
    if (!created.ok) {
      console.error("[zippr] Kit create-subscriber failed:", created.status, created.data);
      return res.status(502).json({ error: "Kit rejected the request. Please try again shortly." });
    }

    // Optionally enroll them in a specific form (e.g. a waitlist sequence).
    if (KIT_FORM_ID) {
      const formResult = await kitRequest(`/forms/${KIT_FORM_ID}/subscribers`, { email_address: email });
      if (!formResult.ok) {
        console.error("[zippr] Kit add-to-form failed:", formResult.status, formResult.data);
        // Don't fail the request — the subscriber was created either way.
      }
    }

    // Optionally tag them for segmentation.
    if (KIT_TAG_ID) {
      const tagResult = await kitRequest(`/tags/${KIT_TAG_ID}/subscribers`, { email_address: email });
      if (!tagResult.ok) {
        console.error("[zippr] Kit tag failed:", tagResult.status, tagResult.data);
      }
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("[zippr] /api/subscribe error:", err);
    return res.status(500).json({ error: "Something went wrong. Please try again." });
  }
});

app.listen(PORT, () => {
  console.log(`Zippr site + API listening on http://localhost:${PORT}`);
});
