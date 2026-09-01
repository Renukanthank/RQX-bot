# RQX-bot

Official AI-powered automation bot developed by Renquantis X (RQX).

> **Ask less. Accomplish more.**

RQX is a chat assistant you embed on your website with one `<script>` tag. Instead of
picking a model, users just say what they want done — RQX routes the request to one of
three tiers automatically:

- **Swift** — fast, everyday requests (quick questions, rewrites, translations, short emails)
- **Prime** — deep reasoning (research, analysis, planning, multi-step problems)
- **Forge** — engineering (code, debugging, architecture, DevOps)

This repo is the **v0.1 MVP**: chat + auto-routing + basic memory + conversation history,
served from a small Node/Express backend, with a plain-JS embeddable widget and a demo
landing page. It's built so the bigger vision (tools, integrations, scheduled tasks,
your own model family) can be layered on without a rewrite — see [Roadmap](#roadmap).

## How it's routed today

There's no custom RQX model yet — that's a later milestone. Today each tier maps to an
Anthropic Claude model with a tier-specific system prompt (configurable via `.env`):

| Tier  | Default model                 | Use case                     |
|-------|--------------------------------|-------------------------------|
| Swift | `claude-haiku-4-5-20251001`   | fast/cheap, everyday chat     |
| Prime | `claude-sonnet-5`              | reasoning, research, planning |
| Forge | `claude-sonnet-5`               | code & engineering            |

Routing is a keyword/length heuristic in [`server/router.js`](server/router.js) (code-ish
words → Forge, research/analysis words or long messages → Prime, else → Swift). Callers
can also force a tier by sending `{ tier: "swift" | "prime" | "forge" }` instead of `"auto"`.

## Quickstart

```bash
npm install
cp .env.example .env
# then edit .env and set ANTHROPIC_API_KEY

npm start
# RQX bot listening on http://localhost:3000
```

Open `http://localhost:3000` to see the demo landing page with the widget live in the
bottom-right corner.

## Embedding on your own site

Add this near the end of `<body>` on any page:

```html
<link rel="stylesheet" href="https://YOUR-RQX-DEPLOYMENT/widget.css" />
<script>
  window.RQX_CONFIG = { apiBase: "https://YOUR-RQX-DEPLOYMENT" };
</script>
<script src="https://YOUR-RQX-DEPLOYMENT/widget.js"></script>
```

Set `ALLOWED_ORIGINS` in `.env` to the domain(s) that will embed the widget (comma-separated),
so the backend's CORS policy only accepts requests from your site.

## API

- `POST /api/chat` — `{ sessionId?, message, tier? }` → `{ sessionId, tier, model, reply }`
- `GET /api/history/:sessionId` — replay stored conversation
- `POST /api/reset/:sessionId` — clear a session's history and memory
- `GET /api/health` — `{ ok, configured }`

Sessions are stored as JSON files under `data/sessions/` (gitignored). Fine for a single
instance; swap `server/memory.js` for a real database before running multiple instances
or needing durable/queryable history.

## Basic memory

Say `remember that <fact>` (or `/remember <fact>`) in the chat and RQX stores it against
your session; the fact is quietly included in context on later turns. This is the "basic
memory" milestone from the MVP list — no cross-session/workspace memory yet.

## Roadmap

Following the staged plan this project is scoped against:

- **v0.1 (this repo)** — chat, Auto/Swift/Prime/Forge routing, basic memory, conversation history
- **v0.2** — tool use (web search, file upload), integrations (email, calendar, Drive, GitHub), scheduled/recurring tasks
- **v1.0** — multi-step agents, deep research mode, workspaces/projects, voice, enterprise controls
- **Longer term** — replace external model APIs with fine-tuned/open-weight RQX Swift/Prime/Forge models, then a proprietary RQX foundation model, backed by an internal eval suite

## Project layout

```
server/
  index.js    Express app, /api routes
  router.js   tier classifier + system prompts + model mapping
  memory.js   per-session history & fact storage (file-based)
public/
  index.html  demo landing page
  widget.js   embeddable chat widget (vanilla JS, no build step)
  widget.css  widget styles
```
