// Content scripts cannot use ES module imports — constants must be inlined.
// Keep in sync with @bulette/shared messaging/index.ts
const SCHEMA_VERSION = "obr-bridge/v1";

const MessageType = {
  CONNECT: "LLM_OBR_CONNECT",
  STATE_REQUEST: "LLM_OBR_STATE_REQUEST",
  STATE_RESPONSE: "LLM_OBR_STATE_RESPONSE",
  PREVIEW: "LLM_OBR_PREVIEW",
  APPLY: "LLM_OBR_APPLY",
  RESULT: "LLM_OBR_RESULT",
  GENERATE_IMAGE_REQUEST: "LLM_OBR_GENERATE_IMAGE_REQUEST",
  GENERATE_IMAGE_RESPONSE: "LLM_OBR_GENERATE_IMAGE_RESPONSE"
} as const;

type BridgeMessage<T = unknown> = {
  schemaVersion: typeof SCHEMA_VERSION;
  type: (typeof MessageType)[keyof typeof MessageType];
  requestId: string;
  payload?: T;
};

declare global {
  interface Window {
    __buletteContentScriptLoaded?: boolean;
  }
}

const allowedBridgeOrigins = [
  "https://vectortangent.github.io",
  "http://localhost:5173",
  "http://127.0.0.1:5173"
];

function isAllowedBridgeOrigin(origin: string): boolean {
  return origin.includes("owlbear.rodeo") || allowedBridgeOrigins.some((allowed) => origin.startsWith(allowed));
}

function postToPage(message: BridgeMessage): number {
  window.postMessage(message, "*");
  let frameCount = 0;
  for (const frame of document.querySelectorAll("iframe")) {
    frame.contentWindow?.postMessage(message, "*");
    frameCount += 1;
  }
  return frameCount;
}

function sendRuntimeMessage(message: unknown): void {
  try {
    chrome.runtime.sendMessage(message);
  } catch {
    // The extension was reloaded while this content script was still attached.
  }
}

if (!window.__buletteContentScriptLoaded) {
  window.__buletteContentScriptLoaded = true;

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    const requestId = message?.requestId ?? crypto.randomUUID();

    if (message?.type === "STATE_REQUEST") {
      const frameCount = postToPage({ type: MessageType.STATE_REQUEST, schemaVersion: SCHEMA_VERSION, requestId });
      sendResponse({ ok: true, requestId, frameCount });
      return;
    }

    if (message?.type === "SEND_PLAN") {
      const frameCount = postToPage({ type: MessageType.PREVIEW, schemaVersion: SCHEMA_VERSION, requestId, payload: message.envelope });
      sendResponse({ ok: true, requestId, frameCount });
      return;
    }

    if (message?.type === "APPLY_PLAN") {
      const frameCount = postToPage({ type: MessageType.APPLY, schemaVersion: SCHEMA_VERSION, requestId, payload: message.envelope });
      sendResponse({ ok: true, requestId, frameCount });
      return;
    }
  });

  window.addEventListener("message", (event) => {
    if (!isAllowedBridgeOrigin(event.origin)) {
      return;
    }
    const message = event.data as BridgeMessage;
    if (!message || message.schemaVersion !== SCHEMA_VERSION) {
      return;
    }
    if (message.type === MessageType.STATE_RESPONSE || message.type === MessageType.RESULT) {
      sendRuntimeMessage({ type: "OBR_RESPONSE", message });
    }
    if (message.type === MessageType.GENERATE_IMAGE_REQUEST) {
      const payload = message.payload as { prompt?: string; model?: string; size?: string } | undefined;
      chrome.runtime.sendMessage(
        { type: "GENERATE_IMAGE", prompt: payload?.prompt, model: payload?.model, size: payload?.size },
        (response) => {
          const responseMessage: BridgeMessage = {
            schemaVersion: SCHEMA_VERSION,
            type: MessageType.GENERATE_IMAGE_RESPONSE,
            requestId: message.requestId,
            payload: response
          };
          for (const frame of document.querySelectorAll("iframe")) {
            frame.contentWindow?.postMessage(responseMessage, "*");
          }
          window.postMessage(responseMessage, "*");
        }
      );
    }
  });

  postToPage({ type: MessageType.CONNECT, schemaVersion: SCHEMA_VERSION, requestId: crypto.randomUUID() });
}
