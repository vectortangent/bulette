export const SCHEMA_VERSION = "obr-bridge/v1";

export const MessageType = {
  CONNECT: "LLM_OBR_CONNECT",
  STATE_REQUEST: "LLM_OBR_STATE_REQUEST",
  STATE_RESPONSE: "LLM_OBR_STATE_RESPONSE",
  PLAN: "LLM_OBR_PLAN",
  PREVIEW: "LLM_OBR_PREVIEW",
  APPLY: "LLM_OBR_APPLY",
  RESULT: "LLM_OBR_RESULT"
} as const;

export type BridgeMessageType = (typeof MessageType)[keyof typeof MessageType];

export type BridgeMessage<T = unknown> = {
  schemaVersion: typeof SCHEMA_VERSION;
  type: BridgeMessageType;
  requestId: string;
  payload?: T;
  error?: { code: string; message: string; details?: unknown };
};
