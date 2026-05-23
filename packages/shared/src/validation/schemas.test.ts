import { describe, expect, it } from "vitest";
import { envelopeSchema } from "./schemas";

describe("envelopeSchema", () => {
  it("accepts a safe preview envelope", () => {
    const envelope = {
      version: "obr-dsl/v1",
      sagaId: "saga-1",
      mode: "preview",
      actor: { role: "GM" },
      safety: {
        requireGmForWrites: true,
        requireConfirmation: true,
        allowNetworkBroadcast: false,
        allowAssetPicker: false,
        allowSceneUpload: false,
        allowViewportControl: false,
        maxItemsAffected: 1
      },
      steps: [
        {
          id: "s1",
          operation: "OBR.scene.items.updateItems",
          effect: "write",
          args: { itemIds: ["abc"], patch: { visible: true } }
        }
      ]
    };
    expect(envelopeSchema.safeParse(envelope).success).toBe(true);
  });

  it("rejects unknown operations", () => {
    const envelope = {
      version: "obr-dsl/v1",
      sagaId: "saga-1",
      mode: "preview",
      actor: {},
      safety: {
        requireGmForWrites: true,
        requireConfirmation: true,
        allowNetworkBroadcast: false,
        allowAssetPicker: false,
        allowSceneUpload: false,
        allowViewportControl: false
      },
      steps: [
        {
          id: "s1",
          operation: "OBR.notReal.operation",
          effect: "write"
        }
      ]
    };
    expect(envelopeSchema.safeParse(envelope).success).toBe(false);
  });

  it("accepts guarded viewport and tool operations", () => {
    const envelope = {
      version: "obr-dsl/v1",
      sagaId: "expanded-api",
      mode: "preview",
      actor: { role: "GM" },
      safety: {
        requireGmForWrites: true,
        requireConfirmation: true,
        allowNetworkBroadcast: false,
        allowAssetPicker: false,
        allowSceneUpload: false,
        allowViewportControl: true,
        allowToolControl: true
      },
      steps: [
        {
          id: "viewport-width",
          operation: "OBR.viewport.getWidth",
          effect: "read"
        },
        {
          id: "active-tool",
          operation: "OBR.tool.getActiveTool",
          effect: "read"
        }
      ]
    };
    expect(envelopeSchema.safeParse(envelope).success).toBe(true);
  });
});
