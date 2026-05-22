import { buildObrSystemPrompt, type ObrDslEnvelope, validateEnvelope } from "@bulette/shared";

type ProviderConfig = {
  apiKey?: string;
  baseUrl?: string;
  defaultModel?: string;
};

const CONFIG_KEY = "providerConfig";
const LAST_PLAN_KEY = "lastPlan";

async function getConfig(): Promise<ProviderConfig> {
  const data = await chrome.storage.local.get(CONFIG_KEY);
  return (data[CONFIG_KEY] as ProviderConfig) ?? {};
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  (async () => {
    if (message?.type === "GET_CONFIG") {
      sendResponse({ ok: true, config: await getConfig() });
      return;
    }
    if (message?.type === "SET_CONFIG") {
      await chrome.storage.local.set({ [CONFIG_KEY]: message.config });
      sendResponse({ ok: true });
      return;
    }
    if (message?.type === "GENERATE_PLAN") {
      const config = await getConfig();
      const payload = {
        model: message.model || config.defaultModel,
        messages: [
          { role: "system", content: buildObrSystemPrompt(message.boardStateSummary || "No board state available.") },
          { role: "user", content: message.prompt }
        ]
      };

      if (!config.apiKey || !config.baseUrl) {
        sendResponse({ ok: false, errors: ["Missing provider configuration"] });
        return;
      }

      const response = await fetch(config.baseUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.apiKey}`
        },
        body: JSON.stringify(payload)
      });

      const llm = await response.json();
      const content = llm?.choices?.[0]?.message?.content;
      let parsed: unknown;
      try {
        parsed = JSON.parse(content);
      } catch {
        sendResponse({ ok: false, errors: ["Model output was not valid JSON"] });
        return;
      }

      const validation = validateEnvelope(parsed);
      if (!validation.ok) {
        sendResponse({ ok: false, errors: validation.errors, raw: parsed });
        return;
      }

      await chrome.storage.local.set({ [LAST_PLAN_KEY]: validation.data });
      sendResponse({ ok: true, envelope: validation.data });
      return;
    }

    if (message?.type === "GET_LAST_PLAN") {
      const data = await chrome.storage.local.get(LAST_PLAN_KEY);
      sendResponse({ ok: true, envelope: data[LAST_PLAN_KEY] as ObrDslEnvelope | undefined });
      return;
    }
  })().catch((error: unknown) => {
    sendResponse({ ok: false, errors: [String(error)] });
  });

  return true;
});
