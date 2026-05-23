import { MessageType, SCHEMA_VERSION, type BridgeMessage, type ObrDslEnvelope, validateEnvelope } from "@bulette/shared";

const promptInput = document.querySelector<HTMLTextAreaElement>("#prompt")!;
const providerInput = document.querySelector<HTMLInputElement>("#provider")!;
const modelInput = document.querySelector<HTMLInputElement>("#model")!;
const boardStateOut = document.querySelector<HTMLElement>("#boardState")!;
const dslOut = document.querySelector<HTMLElement>("#dsl")!;
const errorsOut = document.querySelector<HTMLElement>("#errors")!;

let lastPlan: ObrDslEnvelope | undefined;
let lastBoardState: unknown;

const DEFAULT_GRID_DPI = 150;

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
  grid?: {
    dpi?: number;
    scale?: {
      raw?: string;
      parsed?: {
        multiplier?: number;
        unit?: string;
      };
    };
    type?: string;
    measurement?: string;
  };
  items?: BoardStateItem[];
};

function showEnvelope(envelope: unknown): void {
  dslOut.textContent = JSON.stringify(envelope, null, 2);
}

function showErrors(errors: string[]): void {
  errorsOut.textContent = errors.join("\n");
}

function showStatus(message: string): void {
  errorsOut.textContent = message;
}

function showBoardState(boardState: unknown): void {
  const state = boardState as BoardState | undefined;
  const itemCount = state?.items?.length ?? 0;
  const scale = state?.grid?.scale?.raw ?? "unknown scale";
  const dpi = state?.grid?.dpi ? `${state.grid.dpi}px` : `${DEFAULT_GRID_DPI}px assumed`;
  boardStateOut.textContent = state
    ? `Board state: ${state.sceneReady ? "ready" : "not ready"} | role: ${state.role ?? "unknown"} | grid: ${scale}, ${dpi} | items: ${itemCount}`
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

function normalizePlanWithBoardState(envelope: ObrDslEnvelope, boardState: unknown): ObrDslEnvelope {
  const state = boardState as BoardState | undefined;
  const dpi = state?.grid?.dpi ?? DEFAULT_GRID_DPI;
  const multiplier = state?.grid?.scale?.parsed?.multiplier;
  if (!multiplier) {
    return envelope;
  }

  return {
    ...envelope,
    steps: envelope.steps.map((step) => {
      if (step.operation !== "OBR.scene.items.updateItems" && step.operation !== "OBR.scene.local.updateItems") {
        return step;
      }

      const args = (step.args ?? {}) as Record<string, unknown>;
      const itemIds = args.itemIds as string[] | undefined;
      const itemId = itemIds?.[0];
      const distance = args.moveByDistance;
      const direction = typeof args.direction === "string" ? args.direction.toLowerCase() : undefined;
      const item = state?.items?.find((entry) => entry.id === itemId);
      if (!itemId || typeof distance !== "number" || !direction || !item?.position) {
        return step;
      }

      const pixels = distance / multiplier * dpi;
      const delta =
        direction === "right" ? { x: pixels, y: 0 } :
        direction === "left" ? { x: -pixels, y: 0 } :
        direction === "down" ? { x: 0, y: pixels } :
        direction === "up" ? { x: 0, y: -pixels } :
        undefined;
      if (!delta) {
        return step;
      }

      const patch = (args.patch as Record<string, unknown> | undefined) ?? {};
      const normalizedArgs = Object.fromEntries(
        Object.entries(args).filter(([key]) => key !== "moveByDistance" && key !== "direction")
      );

      return {
        ...step,
        args: {
          ...normalizedArgs,
          patch: {
            ...patch,
            position: {
              x: (item.position.x ?? 0) + delta.x,
              y: (item.position.y ?? 0) + delta.y
            }
          }
        }
      };
    })
  };
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

  lastPlan = normalizePlanWithBoardState(validation.data, boardState);
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
  lastPlan = normalizePlanWithBoardState(lastPlan, lastBoardState);
  showEnvelope(lastPlan);
  try {
    const requestId = crypto.randomUUID();
    const pendingResult = waitForBridgeResponse(requestId, MessageType.RESULT, 35000);
    const request = await sendToActiveTab({ type: "SEND_PLAN", requestId, envelope: { ...lastPlan, mode: "preview" } }) as { ok?: boolean; errors?: string[]; requestId?: string; frameCount?: number };
    if (!request?.ok) {
      pendingResult.catch(() => undefined);
      showErrors(request?.errors ?? ["Failed to send plan to Owlbear"]);
      return;
    }
    if (request.frameCount === 0) {
      pendingResult.catch(() => undefined);
      showErrors(["Sent to the Owlbear page, but no extension iframe was found. Open the Bulette Owlbear popover, then try again."]);
      return;
    }
    const result = await pendingResult;
    showStatus(JSON.stringify(result.payload, null, 2));
    return;
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
  lastPlan = normalizePlanWithBoardState(lastPlan, lastBoardState);
  showEnvelope(lastPlan);
  try {
    const requestId = crypto.randomUUID();
    const pendingResult = waitForBridgeResponse(requestId, MessageType.RESULT, 35000);
    const request = await sendToActiveTab({ type: "APPLY_PLAN", requestId, envelope: { ...lastPlan, mode: "apply" } }) as { ok?: boolean; errors?: string[]; requestId?: string; frameCount?: number };
    if (!request?.ok) {
      pendingResult.catch(() => undefined);
      showErrors(request?.errors ?? ["Failed to apply plan in Owlbear"]);
      return;
    }
    if (request.frameCount === 0) {
      pendingResult.catch(() => undefined);
      showErrors(["Sent to the Owlbear page, but no extension iframe was found. Open the Bulette Owlbear popover, then try again."]);
      return;
    }
    const result = await pendingResult;
    showStatus(JSON.stringify(result.payload, null, 2));
    return;
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
