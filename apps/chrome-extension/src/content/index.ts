import { MessageType, SCHEMA_VERSION, type BridgeMessage } from "@bulette/shared";

function postToPage(message: BridgeMessage): void {
  window.postMessage(message, "*");
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  const requestId = crypto.randomUUID();

  if (message?.type === "STATE_REQUEST") {
    postToPage({ type: MessageType.STATE_REQUEST, schemaVersion: SCHEMA_VERSION, requestId });
    sendResponse({ ok: true, requestId });
    return;
  }

  if (message?.type === "SEND_PLAN") {
    postToPage({ type: MessageType.PREVIEW, schemaVersion: SCHEMA_VERSION, requestId, payload: message.envelope });
    sendResponse({ ok: true, requestId });
    return;
  }

  if (message?.type === "APPLY_PLAN") {
    postToPage({ type: MessageType.APPLY, schemaVersion: SCHEMA_VERSION, requestId, payload: message.envelope });
    sendResponse({ ok: true, requestId });
    return;
  }
});

window.addEventListener("message", (event) => {
  if (event.source !== window) {
    return;
  }
  if (!event.origin.includes("owlbear.rodeo")) {
    return;
  }
  const message = event.data as BridgeMessage;
  if (!message || message.schemaVersion !== SCHEMA_VERSION) {
    return;
  }
  if (message.type === MessageType.STATE_RESPONSE || message.type === MessageType.RESULT) {
    chrome.runtime.sendMessage({ type: "OBR_RESPONSE", message });
  }
});

window.postMessage({ type: MessageType.CONNECT, schemaVersion: SCHEMA_VERSION, requestId: crypto.randomUUID() }, "*");
