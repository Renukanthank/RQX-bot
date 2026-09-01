import "dotenv/config";
import path from "node:path";
import express from "express";
import cors from "cors";
import { nanoid } from "nanoid";
import Anthropic from "@anthropic-ai/sdk";
import { classify, SYSTEM_PROMPTS, modelForTier } from "./router.js";
import {
  loadSession,
  saveSession,
  clearSession,
  extractFact,
  factsToContext,
} from "./memory.js";

const app = express();
const PORT = process.env.PORT || 3000;
const allowedOrigins = (process.env.ALLOWED_ORIGINS || "*")
  .split(",")
  .map((o) => o.trim());

const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
      // Identity-linked personal API keys require this header; workspace API
      // keys ignore it. Safe to leave unset for the latter.
      defaultHeaders: process.env.ANTHROPIC_WORKSPACE_ID
        ? { "anthropic-workspace-id": process.env.ANTHROPIC_WORKSPACE_ID }
        : undefined,
    })
  : null;

app.use(
  cors({
    origin: allowedOrigins.includes("*") ? true : allowedOrigins,
  }),
);
app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(process.cwd(), "public")));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, configured: Boolean(anthropic) });
});

app.get("/api/history/:sessionId", (req, res) => {
  const { history } = loadSession(req.params.sessionId);
  res.json({ history });
});

app.post("/api/reset/:sessionId", (req, res) => {
  clearSession(req.params.sessionId);
  res.json({ ok: true });
});

app.post("/api/chat", async (req, res) => {
  const { message, tier: requestedTier } = req.body ?? {};
  const sessionId = req.body?.sessionId || nanoid();

  if (typeof message !== "string" || !message.trim()) {
    return res.status(400).json({ error: "message is required" });
  }

  if (!anthropic) {
    return res.status(503).json({
      error:
        "RQX backend is not configured. Set ANTHROPIC_API_KEY in your environment.",
    });
  }

  const tier = classify(message, requestedTier);
  const model = modelForTier(tier);
  const session = loadSession(sessionId);

  const fact = extractFact(message);
  if (fact) {
    session.facts.push(fact);
  }

  session.history.push({ role: "user", content: message });

  try {
    const response = await anthropic.messages.create({
      model,
      max_tokens: 1024,
      system: SYSTEM_PROMPTS[tier] + factsToContext(session.facts),
      messages: session.history,
    });

    const reply = response.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("\n")
      .trim();

    session.history.push({ role: "assistant", content: reply });
    saveSession(sessionId, session);

    res.json({ sessionId, tier, model, reply });
  } catch (err) {
    console.error("RQX chat error:", err);
    res.status(502).json({ error: "RQX had trouble reaching its model. Try again." });
  }
});

app.listen(PORT, () => {
  console.log(`RQX bot listening on http://localhost:${PORT}`);
  if (!anthropic) {
    console.warn(
      "ANTHROPIC_API_KEY is not set — /api/chat will return 503 until it is configured.",
    );
  }
});
