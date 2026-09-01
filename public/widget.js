(function () {
  const config = window.RQX_CONFIG || {};
  const API_BASE = (config.apiBase || "").replace(/\/$/, "");
  const SESSION_KEY = "rqx_session_id";

  function getSessionId() {
    let id = localStorage.getItem(SESSION_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(SESSION_KEY, id);
    }
    return id;
  }

  const TIER_LABEL = { swift: "Swift", prime: "Prime", forge: "Forge" };

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function buildWidget() {
    const root = el("div");
    root.id = "rqx-widget-root";

    const button = el("button", "rqx-bubble", "RQX");
    button.setAttribute("aria-label", "Open RQX assistant");

    const panel = el("div", "rqx-panel");
    panel.hidden = true;

    const header = el("div", "rqx-header");
    const title = el("div", "rqx-title");
    title.innerHTML = "<strong>RQX</strong><span>Ask less. Accomplish more.</span>";
    const closeBtn = el("button", "rqx-close", "✕");
    closeBtn.setAttribute("aria-label", "Close");
    header.append(title, closeBtn);

    const messages = el("div", "rqx-messages");

    const form = el("form", "rqx-form");
    const input = el("input", "rqx-input");
    input.type = "text";
    input.placeholder = "Ask RQX anything...";
    input.autocomplete = "off";
    const sendBtn = el("button", "rqx-send", "Send");
    sendBtn.type = "submit";
    form.append(input, sendBtn);

    panel.append(header, messages, form);
    root.append(button, panel);
    document.body.appendChild(root);

    function addMessage(role, text, tier) {
      const row = el("div", `rqx-msg rqx-msg-${role}`);
      if (role === "assistant" && tier) {
        const badge = el("span", `rqx-badge rqx-badge-${tier}`, TIER_LABEL[tier] || tier);
        row.appendChild(badge);
      }
      const bubble = el("div", "rqx-bubble-text", text);
      row.appendChild(bubble);
      messages.appendChild(row);
      messages.scrollTop = messages.scrollHeight;
      return row;
    }

    async function loadHistory() {
      try {
        const res = await fetch(`${API_BASE}/api/history/${getSessionId()}`);
        const data = await res.json();
        (data.history || []).forEach((msg) => {
          if (msg.role === "user" || msg.role === "assistant") {
            addMessage(msg.role, msg.content);
          }
        });
        if (!data.history || data.history.length === 0) {
          addMessage(
            "assistant",
            "Hi, I'm RQX. Tell me what you want accomplished — I'll route it to the right tier.",
          );
        }
      } catch {
        addMessage(
          "assistant",
          "Hi, I'm RQX. Tell me what you want accomplished — I'll route it to the right tier.",
        );
      }
    }

    let opened = false;
    button.addEventListener("click", () => {
      panel.hidden = !panel.hidden;
      if (!panel.hidden && !opened) {
        opened = true;
        loadHistory();
        input.focus();
      }
    });
    closeBtn.addEventListener("click", () => {
      panel.hidden = true;
    });

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const text = input.value.trim();
      if (!text) return;
      input.value = "";
      sendBtn.disabled = true;
      addMessage("user", text);
      const thinking = addMessage("assistant", "…");

      try {
        const res = await fetch(`${API_BASE}/api/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId: getSessionId(), message: text }),
        });
        const data = await res.json();
        thinking.remove();
        if (!res.ok) {
          addMessage("assistant", data.error || "Something went wrong.");
        } else {
          addMessage("assistant", data.reply, data.tier);
        }
      } catch {
        thinking.remove();
        addMessage("assistant", "Couldn't reach RQX. Check your connection and try again.");
      } finally {
        sendBtn.disabled = false;
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", buildWidget);
  } else {
    buildWidget();
  }
})();
