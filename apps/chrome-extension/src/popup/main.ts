import { MessageType, SCHEMA_VERSION, type BridgeMessage, type ObrDslEnvelope, validateEnvelope } from "@bulette/shared";

const promptInput = document.querySelector<HTMLTextAreaElement>("#prompt")!;
const providerInput = document.querySelector<HTMLInputElement>("#provider")!;
const modelInput = document.querySelector<HTMLInputElement>("#model")!;
const boardStateOut = document.querySelector<HTMLElement>("#boardState")!;
const dslOut = document.querySelector<HTMLElement>("#dsl")!;
const errorsOut = document.querySelector<HTMLElement>("#errors")!;

let lastPlan: ObrDslEnvelope | undefined;
let lastBoardState: unknown;

type BoardStateItem = {
  id?: string;
  name?: string;
  layer?: string;
  position?: { x?: number; y?: number };
  visible?: boolean;
  locked?: boolean;
  metadata?: unknown;
};

type BoardState = {
  sceneReady?: boolean;
  role?: string;
  grid?: unknown;
  items?: BoardStateItem[];
};

function showEnvelope(envelope: unknown): void {
  dslOut.textContent = JSON.stringify(envelope, null, 2);
}

function showErrors(errors: string[]): void {
  errorsOut.textContent = errors.join("\n");
}

function showBoardState(boardState: unknown): void {
  const state = boardState as BoardState | undefined;
  const itemCount = state?.items?.length ?? 0;
  boardStateOut.textContent = state
    ? `Board state: ${state.sceneReady ? "ready" : "not ready"} | role: ${state.role ?? "unknown"} | items: ${itemCount}`
    : "Board state: unavailable";
}

function summarizeBoardState(boardState: unknown): string {
  const state = boardState as BoardState | undefined;
  if (!state) {
    return "No board state available.";
  }

  const items = (state.items ?? []).slice(0, 80).map((item) => ({
    id: item.id,
    name: item.name,
    layer: item.layer,
    position: item.position,
    visible: item.visible,
    locked: item.locked,
    metadata: item.metadata
  }));

  return JSON.stringify({
    sceneReady: state.sceneReady,
    role: state.role,
    grid: state.grid,
    itemCount: state.items?.length ?? 0,
    items
  });
}

async function getActiveTabId(): Promise<number | undefined> {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return tabs[0]?.id;
}

async function sendToActiveTab(message: unknown): Promise<unknown> {
  const tabId = await getActiveTabId();
  if (!tabId) {
    throw new Error("No active Owlbear tab found");
  }
  try {
    return await chrome.tabs.sendMessage(tabId, message);
  } catch (error) {
    if (!String(error).includes("Receiving end does not exist")) {
      throw error;
    }
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["assets/content.js"]
    });
    return chrome.tabs.sendMessage(tabId, message);
  }
}

function waitForBridgeResponse(requestId: string, type: string, timeoutMs = 5000): Promise<BridgeMessage> {
  return new Promise((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      chrome.runtime.onMessage.removeListener(listener);
      reject(new Error(`Timed out waiting for ${type}`));
    }, timeoutMs);

    const listener = (message: { type?: string; message?: BridgeMessage }) => {
      if (message.type !== "OBR_RESPONSE") {
        return;
      }
      if (!message.message || message.message.schemaVersion !== SCHEMA_VERSION) {
        return;
      }
      if (message.message.requestId !== requestId || message.message.type !== type) {
        return;
      }
      window.clearTimeout(timeoutId);
      chrome.runtime.onMessage.removeListener(listener);
      resolve(message.message);
    };

    chrome.runtime.onMessage.addListener(listener);
  });
}

async function refreshBoardState(): Promise<unknown> {
  const requestId = crypto.randomUUID();
  const pendingResponse = waitForBridgeResponse(requestId, MessageType.STATE_RESPONSE);
  const response = await sendToActiveTab({ type: "STATE_REQUEST", requestId }) as { ok?: boolean; errors?: string[]; requestId?: string; frameCount?: number };
  if (!response?.ok || !response.requestId) {
    throw new Error(response?.errors?.join("\n") || "Failed to request board state");
  }
  if (response.frameCount === 0) {
    throw new Error("No Owlbear extension iframe found. Open the Bulette Owlbear popover, then refresh board state.");
  }

  const bridgeResponse = await pendingResponse;
  lastBoardState = bridgeResponse.payload;
  await chrome.runtime.sendMessage({ type: "SET_BOARD_STATE", boardState: lastBoardState });
  showBoardState(lastBoardState);
  return lastBoardState;
}

document.querySelector("#refreshState")?.addEventListener("click", async () => {
  try {
    await refreshBoardState();
    showErrors([]);
  } catch (error) {
    showErrors([`${String(error)}. Make sure the active tab is an Owlbear room and the Bulette Owlbear popover is open.`]);
  }
});

document.querySelector("#generate")?.addEventListener("click", async () => {
  let boardState = lastBoardState;
  try {
    boardState = await refreshBoardState();
  } catch {
    const cached = await chrome.runtime.sendMessage({ type: "GET_BOARD_STATE" });
    boardState = cached.boardState;
    showBoardState(boardState);
  }

  const response = await chrome.runtime.sendMessage({
    type: "GENERATE_PLAN",
    prompt: promptInput.value,
    provider: providerInput.value,
    model: modelInput.value,
    boardStateSummary: summarizeBoardState(boardState)
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
  if (!lastPlan) {
    const response = await chrome.runtime.sendMessage({ type: "GET_LAST_PLAN" });
    lastPlan = response.envelope;
  }
  if (!lastPlan) {
    showErrors(["No generated plan to send"]);
    return;
  }
  try {
    const response = await sendToActiveTab({ type: "SEND_PLAN", envelope: { ...lastPlan, mode: "preview" } }) as { ok?: boolean; errors?: string[]; frameCount?: number };
    if (!response?.ok) {
      showErrors(response?.errors ?? ["Failed to send plan to Owlbear"]);
      return;
    }
    if (response.frameCount === 0) {
      showErrors(["Sent to the Owlbear page, but no extension iframe was found. Open the Bulette Owlbear extension popover, then try again."]);
      return;
    }
  } catch (error) {
    showErrors([`${String(error)}. Make sure the active tab is an Owlbear room and reload the tab after reloading the Chrome extension.`]);
    return;
  }
  showErrors([]);
});

document.querySelector("#apply")?.addEventListener("click", async () => {
  if (!lastPlan) {
    const response = await chrome.runtime.sendMessage({ type: "GET_LAST_PLAN" });
    lastPlan = response.envelope;
  }
  if (!lastPlan) {
    showErrors(["No generated plan to apply"]);
    return;
  }
  try {
    const response = await sendToActiveTab({ type: "APPLY_PLAN", envelope: { ...lastPlan, mode: "apply" } }) as { ok?: boolean; errors?: string[]; frameCount?: number };
    if (!response?.ok) {
      showErrors(response?.errors ?? ["Failed to apply plan in Owlbear"]);
      return;
    }
    if (response.frameCount === 0) {
      showErrors(["Sent to the Owlbear page, but no extension iframe was found. Open the Bulette Owlbear extension popover, then try again."]);
      return;
    }
  } catch (error) {
    showErrors([`${String(error)}. Make sure the active tab is an Owlbear room and reload the tab after reloading the Chrome extension.`]);
    return;
  }
  showErrors([]);
});

chrome.runtime.sendMessage({ type: "GET_CONFIG" }).then((response) => {
  if (response?.ok) {
    providerInput.value = response.config.baseUrl ?? "";
    modelInput.value = response.config.defaultModel ?? "";
  }
});

chrome.runtime.sendMessage({ type: "GET_BOARD_STATE" }).then((response) => {
  if (response?.ok) {
    lastBoardState = response.boardState;
    showBoardState(lastBoardState);
  }
});
