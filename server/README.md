# Zippr site server

Serves the static site and adds one endpoint, `POST /api/subscribe`, which
forwards "notify me" sign-ups from [contact.html](../contact.html) to
[Kit](https://kit.com) (formerly ConvertKit).

## Why this exists

Kit's own docs are explicit: an API key **"must be kept secret and used
server-side only"** — it's not safe in browser JavaScript, because anyone
can read it via "View Source" and then read/write your whole Kit account
(subscribers, broadcasts, everything), not just submit this form.

So the key lives only here, on the server, as an environment variable. The
browser never sees it — it just calls `/api/subscribe` on the same origin
with an email address, and this server calls Kit on its behalf.

## Setup

```bash
cd server
npm install
cp .env.example .env   # then fill in KIT_API_KEY below
```

Edit `server/.env`:

```
KIT_API_KEY=kit_your_real_key_here   # Kit → Settings → Developer
KIT_FORM_ID=                         # optional — enrolls sign-ups in a specific form
KIT_TAG_ID=                          # optional — tags sign-ups for segmentation
PORT=3000
```

`server/.env` is gitignored — never commit it.

## Run

```bash
npm start
```

Then open **http://localhost:3000** — this serves `index.html`,
`developers.html`, `contact.html`, and `assets/` directly, so you don't need
a separate static server. Submitting the contact form now creates/updates a
subscriber in Kit via `POST /v4/subscribers` (an upsert — safe to submit the
same email twice), and optionally enrolls them in a form and/or applies a
tag if you set `KIT_FORM_ID` / `KIT_TAG_ID`.

## Deploying

This is a plain Node/Express app (`node server.js`), so it runs on any
Node host — Render, Railway, Fly.io, a VPS, etc. Set `KIT_API_KEY` (and
optionally `KIT_FORM_ID` / `KIT_TAG_ID`) as environment variables on the
host instead of a `.env` file. If you'd rather deploy to Netlify, Vercel,
or Cloudflare Pages, the `/api/subscribe` logic in `server.js` ports
directly into their serverless/edge function formats — say the word and
it can be adapted.

## A note on the key you shared

Since the Kit API key was pasted in plain text into a chat, treat it as
potentially exposed: it's worth rotating (Kit → Settings → Developer →
regenerate) once you've copied the new one into `server/.env`, just as you
would after sharing any credential outside a password manager.
