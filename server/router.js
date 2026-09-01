const CODE_PATTERN =
  /\b(code|codebase|bug|debug|function|api|endpoint|database|sql|python|javascript|typescript|java\b|repo|repository|git|github|deploy|deployment|error|stack trace|traceback|refactor|compile|script|terminal|regex|algorithm|docker|kubernetes|devops|server|backend|frontend|css|html|package\.json|npm|pip install)\b/i;

const COMPLEX_PATTERN =
  /\b(research|analy[sz]e|analysis|compare|comparison|report|strategy|business plan|market|investigate|evaluate|multi-step|decision|recommend|due diligence|pros and cons|trade-?offs?)\b/i;

export const TIERS = {
  SWIFT: "swift",
  PRIME: "prime",
  FORGE: "forge",
};

/**
 * Heuristic classifier standing in for the eventual RQX Brain router.
 * Explicit user overrides always win; "auto" falls through to keyword rules.
 */
export function classify(message, requestedTier = "auto") {
  const tier = (requestedTier || "auto").toLowerCase();
  if (Object.values(TIERS).includes(tier)) {
    return tier;
  }

  const text = message.trim();

  if (CODE_PATTERN.test(text)) {
    return TIERS.FORGE;
  }

  if (COMPLEX_PATTERN.test(text) || text.length > 400) {
    return TIERS.PRIME;
  }

  return TIERS.SWIFT;
}

const BASE_SYSTEM =
  "You are RQX, the AI assistant built by RENQUANTIS X. Motto: 'Ask less. Accomplish more.' " +
  "Be direct, helpful, and action-oriented. Never claim to have taken a real-world action " +
  "(sending an email, booking something, modifying a file) unless a tool result actually confirms it.";

export const SYSTEM_PROMPTS = {
  [TIERS.SWIFT]:
    BASE_SYSTEM +
    " You are running as RQX Swift: the fast, everyday tier. Handle quick questions, rewrites, " +
    "translations, summaries, and short emails. Keep answers brief and to the point.",
  [TIERS.PRIME]:
    BASE_SYSTEM +
    " You are running as RQX Prime: the deep reasoning tier. Handle research, business analysis, " +
    "planning, and multi-step problems. Think through the problem, lay out your steps, and give a " +
    "thorough, well-organized answer.",
  [TIERS.FORGE]:
    BASE_SYSTEM +
    " You are running as RQX Forge: the engineering tier. Handle code, debugging, architecture, and " +
    "technical/DevOps questions. Give precise, working code with brief explanations.",
};

export function modelForTier(tier) {
  const envKey = {
    [TIERS.SWIFT]: "RQX_SWIFT_MODEL",
    [TIERS.PRIME]: "RQX_PRIME_MODEL",
    [TIERS.FORGE]: "RQX_FORGE_MODEL",
  }[tier];

  return process.env[envKey];
}
