import { type ObrDslEnvelope, validateEnvelope } from "@bulette/shared";

const promptInput = document.querySelector<HTMLTextAreaElement>("#prompt")!;
const providerInput = document.querySelector<HTMLInputElement>("#provider")!;
const modelInput = document.querySelector<HTMLInputElement>("#model")!;
const dslOut = document.querySelector<HTMLElement>("#dsl")!;
const errorsOut = document.querySelector<HTMLElement>("#errors")!;

let lastPlan: ObrDslEnvelope | undefined;

function showEnvelope(envelope: unknown): void {
  dslOut.textContent = JSON.stringify(envelope, null, 2);
}

function showErrors(errors: string[]): void {
  errorsOut.textContent = errors.join("\n");
}

async function getActiveTabId(): Promise<number | undefined> {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return tabs[0]?.id;
}

document.querySelector("#generate")?.addEventListener("click", async () => {
  const response = await chrome.runtime.sendMessage({
    type: "GENERATE_PLAN",
    prompt: promptInput.value,
    provider: providerInput.value,
    model: modelInput.value
  });

  if (!response.ok) {
    showErrors(response.errors ?? ["Generation failed"]);
    if (response.raw) showEnvelope(response.raw);
    return;
  }

  const validation = validateEnvelope(response.envelope);
  if (!validation.ok) {
    showErrors(validation.errors);
    return;
  }

  lastPlan = validation.data;
  showEnvelope(lastPlan);
  showErrors([]);
});

document.querySelector("#send")?.addEventListener("click", async () => {
  const tabId = await getActiveTabId();
  if (!tabId || !lastPlan) return;
  await chrome.tabs.sendMessage(tabId, { type: "SEND_PLAN", envelope: { ...lastPlan, mode: "preview" } });
});

document.querySelector("#apply")?.addEventListener("click", async () => {
  if (!lastPlan) {
    const response = await chrome.runtime.sendMessage({ type: "GET_LAST_PLAN" });
    lastPlan = response.envelope;
  }
  const tabId = await getActiveTabId();
  if (!tabId || !lastPlan) return;
  await chrome.tabs.sendMessage(tabId, { type: "APPLY_PLAN", envelope: { ...lastPlan, mode: "apply" } });
});

chrome.runtime.sendMessage({ type: "GET_CONFIG" }).then((response) => {
  if (response?.ok) {
    providerInput.value = response.config.baseUrl ?? "";
    modelInput.value = response.config.defaultModel ?? "";
  }
});
