import { useEffect, useMemo, useState } from "react";
import OBR from "@owlbear-rodeo/sdk";
import { MessageType, SCHEMA_VERSION, type BridgeMessage, type ObrDslEnvelope } from "@bulette/shared";
import { executeObrSaga } from "./obr/executor";
import { extractBoardState } from "./obr/state";

export default function App() {
  const [ready, setReady] = useState(false);
  const [log, setLog] = useState<string[]>([]);

  useEffect(() => {
    OBR.onReady(() => {
      setReady(true);
      setLog((current) => [...current, "OBR ready"]);
    });
  }, []);

  useEffect(() => {
    const handler = async (event: MessageEvent<BridgeMessage>) => {
      if (!event.data || event.data.schemaVersion !== SCHEMA_VERSION) return;
      if (event.source !== window.parent && event.source !== window) return;

      if (event.data.type === MessageType.CONNECT) {
        setLog((current) => [...current, "Bridge connected"]);
        return;
      }

      if (event.data.type === MessageType.STATE_REQUEST) {
        const state = await extractBoardState();
        window.parent.postMessage({
          schemaVersion: SCHEMA_VERSION,
          type: MessageType.STATE_RESPONSE,
          requestId: event.data.requestId,
          payload: state
        } satisfies BridgeMessage, "*");
        return;
      }

      if (event.data.type === MessageType.PREVIEW || event.data.type === MessageType.APPLY || event.data.type === MessageType.PLAN) {
        const envelope = event.data.payload as ObrDslEnvelope;
        const report = await executeObrSaga({ ...envelope, mode: event.data.type === MessageType.APPLY ? "apply" : "preview" });
        if (report.ok) {
          await OBR.notification.show("Saga executed", "SUCCESS");
        } else {
          await OBR.notification.show("Saga failed", "ERROR");
        }
        setLog((current) => [...current, `${event.data.type}: ${report.ok ? "ok" : "failed"}`]);
        window.parent.postMessage({
          schemaVersion: SCHEMA_VERSION,
          type: MessageType.RESULT,
          requestId: event.data.requestId,
          payload: report
        } satisfies BridgeMessage, "*");
      }
    };

    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  const logText = useMemo(() => log.join("\n"), [log]);

  return (
    <main>
      <h1>Bulette Owlbear Bridge</h1>
      <p>Status: {ready ? "Ready" : "Waiting for OBR.onReady"}</p>
      <h2>Execution log</h2>
      <pre>{logText}</pre>
    </main>
  );
}
