export const OBR_DSL_JSON_SCHEMA = JSON.stringify({
  type: "object",
  required: ["version", "sagaId", "mode", "actor", "safety", "steps"],
  additionalProperties: false,
  properties: {
    version: { const: "obr-dsl/v1" },
    sagaId: { type: "string", minLength: 1 },
    mode: { enum: ["read", "plan", "preview", "apply", "rollback"] },
    actor: {
      type: "object",
      additionalProperties: false,
      properties: {
        playerId: { type: "string" },
        role: { enum: ["GM", "PLAYER"] },
        connectionId: { type: "string" }
      }
    },
    safety: {
      type: "object",
      required: ["requireGmForWrites", "requireConfirmation", "allowNetworkBroadcast", "allowAssetPicker", "allowSceneUpload", "allowViewportControl"],
      additionalProperties: false,
      properties: {
        requireGmForWrites: { type: "boolean" },
        requireConfirmation: { type: "boolean" },
        allowNetworkBroadcast: { type: "boolean" },
        allowAssetPicker: { type: "boolean" },
        allowSceneUpload: { type: "boolean" },
        allowViewportControl: { type: "boolean" },
        maxItemsAffected: { type: "integer", minimum: 1 }
      }
    },
    steps: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        required: ["id", "operation", "effect"],
        additionalProperties: false,
        properties: {
          id: { type: "string", minLength: 1 },
          label: { type: "string" },
          operation: {
            enum: [
              "OBR.scene.isReady",
              "OBR.scene.getMetadata",
              "OBR.scene.setMetadata",
              "OBR.scene.items.getItems",
              "OBR.scene.items.addItems",
              "OBR.scene.items.updateItems",
              "OBR.scene.items.deleteItems",
              "OBR.scene.items.onChange",
              "OBR.scene.local.addItems",
              "OBR.scene.local.updateItems",
              "OBR.scene.local.deleteItems",
              "OBR.scene.grid.getDpi",
              "OBR.scene.grid.getScale",
              "OBR.scene.grid.setScale",
              "OBR.scene.grid.getColor",
              "OBR.scene.grid.setColor",
              "OBR.scene.grid.getOpacity",
              "OBR.scene.grid.setOpacity",
              "OBR.scene.grid.getType",
              "OBR.scene.grid.setType",
              "OBR.scene.grid.getLineType",
              "OBR.scene.grid.setLineType",
              "OBR.scene.grid.getMeasurement",
              "OBR.scene.grid.setMeasurement",
              "OBR.scene.grid.getLineWidth",
              "OBR.scene.grid.setLineWidth",
              "OBR.scene.grid.snapPosition",
              "OBR.scene.grid.getDistance",
              "OBR.scene.fog.getColor",
              "OBR.scene.fog.setColor",
              "OBR.scene.fog.getStrokeWidth",
              "OBR.scene.fog.setStrokeWidth",
              "OBR.scene.fog.getFilled",
              "OBR.scene.fog.setFilled",
              "OBR.viewport.getPosition",
              "OBR.viewport.setPosition",
              "OBR.viewport.getScale",
              "OBR.viewport.setScale",
              "OBR.player.getId",
              "OBR.player.getName",
              "OBR.player.getRole",
              "OBR.player.getColor",
              "OBR.player.getConnectionId",
              "OBR.player.getMetadata",
              "OBR.player.setMetadata",
              "OBR.party.getPlayers",
              "OBR.room.getId",
              "OBR.room.getMetadata",
              "OBR.room.setMetadata",
              "OBR.broadcast.sendMessage",
              "OBR.notification.show",
              "OBR.action.open",
              "OBR.action.close",
              "OBR.action.isOpen",
              "OBR.action.setTitle",
              "OBR.action.setIcon",
              "OBR.action.setBadgeText",
              "OBR.action.setSize",
              "OBR.modal.open",
              "OBR.modal.close",
              "OBR.popover.open",
              "OBR.popover.close",
              "OBR.assets.downloadImages",
              "OBR.assets.downloadScenes",
              "OBR.assets.uploadImages",
              "OBR.assets.uploadScenes",
              "OBR.interaction.startItemInteraction",
              "OBR.interaction.updateItemInteraction",
              "OBR.interaction.stopItemInteraction"
            ]
          },
          args: { type: "object" },
          effect: { enum: ["read", "write", "subscribe", "ui", "broadcast", "interaction"] },
          saveAs: { type: "string" },
          uses: { type: "array", items: { type: "string" } },
          guard: {
            type: "object",
            additionalProperties: false,
            properties: {
              requireSceneReady: { type: "boolean" },
              requireRole: { enum: ["GM", "PLAYER"] },
              requireConfirmation: { type: "boolean" },
              maxItemsAffected: { type: "integer", minimum: 1 },
              allowedEffects: { type: "array", items: { enum: ["read", "write", "subscribe", "ui", "broadcast", "interaction"] } }
            }
          }
        }
      }
    }
  }
});

export function buildObrSystemPrompt(boardStateSummary: string): string {
  return [
    "You are an Owlbear Rodeo planner.",
    "Return only valid JSON. Do not wrap it in markdown.",
    `JSON Schema for the only valid response shape: ${OBR_DSL_JSON_SCHEMA}`,
    "Return exactly one ObrDslEnvelope object. Do not return operation/parameters wrapper objects.",
    "The top-level JSON object must contain exactly these required fields: version, sagaId, mode, actor, safety, steps.",
    "Use version exactly \"obr-dsl/v1\".",
    "Use mode \"preview\" for writes unless the user explicitly asks to apply immediately.",
    "Use actor.role \"GM\" for writes.",
    "Use exact OBR operation casing from this allowed set only: OBR.scene.isReady, OBR.scene.getMetadata, OBR.scene.setMetadata, OBR.scene.items.getItems, OBR.scene.items.addItems, OBR.scene.items.updateItems, OBR.scene.items.deleteItems, OBR.scene.local.addItems, OBR.scene.local.updateItems, OBR.scene.local.deleteItems, OBR.assets.downloadImages, OBR.notification.show.",
    "Every step must contain id, operation, effect, and args.",
    "For OBR.scene.items.updateItems and OBR.scene.local.updateItems, args must be {\"itemIds\":[\"existing-item-id\"],\"patch\":{...changed fields...}}.",
    "Never use args.items for updateItems. Use args.items only with addItems/local.addItems.",
    "To move an item, patch position directly, for example: {\"itemIds\":[\"abc\"],\"patch\":{\"position\":{\"x\":100,\"y\":200}}}.",
    "For relative movement, prefer args {\"itemIds\":[\"abc\"],\"moveByDistance\":15,\"direction\":\"right\"}; the executor converts it using live grid scale.",
    "When converting movement in feet/meters/etc to pixels, use boardState.grid.scale.parsed.multiplier and boardState.grid.dpi.",
    "Pixels to move = requestedDistance / boardState.grid.scale.parsed.multiplier * boardState.grid.dpi.",
    "For example, if scale is 5 ft and dpi is 150, then 15 ft is 15 / 5 * 150 = 450 pixels.",
    "For a square grid, right means +x, left means -x, down means +y, and up means -y.",
    "To add plain text, use OBR.scene.items.addItems with args.items containing simple objects like {\"type\":\"text\",\"text\":\"hello\",\"position\":{\"x\":0,\"y\":0},\"layer\":\"TEXT\",\"fontSize\":24,\"color\":\"#000000\",\"alignment\":\"center\"}; the executor will build valid Owlbear text items.",
    "Valid effects are read, write, subscribe, ui, broadcast, interaction.",
    "Never output AddToken, MoveToken, Plan, or any other invented operation names.",
    "Never output JavaScript. Never use eval.",
    "Prefer tactical aliases internally, but always compile them to valid OBR operation steps before returning JSON.",
    "Use known item IDs from board state; do not guess names.",
    "If the user asks to add a token from characters, assets, or the character library, use OBR.assets.downloadImages with args {\"multiple\":false,\"defaultSearch\":\"requested name\",\"typeHint\":\"CHARACTER\",\"addToScene\":true,\"name\":\"requested name\",\"position\":{\"x\":0,\"y\":0}} and set safety.allowAssetPicker true.",
    "If the user asks to create a token but does not mention characters/assets/library and no complete Owlbear item JSON is available, return a preview envelope with one OBR.notification.show step explaining that a token asset/item definition is needed.",
    "Use this safety object unless the user asks for broader permissions: {\"requireGmForWrites\":true,\"requireConfirmation\":true,\"allowNetworkBroadcast\":false,\"allowAssetPicker\":false,\"allowSceneUpload\":false,\"allowViewportControl\":false,\"maxItemsAffected\":1}.",
    "Example valid response for an unsupported token creation request:",
    "{\"version\":\"obr-dsl/v1\",\"sagaId\":\"create-token-needs-asset\",\"mode\":\"preview\",\"actor\":{\"role\":\"GM\"},\"safety\":{\"requireGmForWrites\":true,\"requireConfirmation\":true,\"allowNetworkBroadcast\":false,\"allowAssetPicker\":false,\"allowSceneUpload\":false,\"allowViewportControl\":false,\"maxItemsAffected\":1},\"steps\":[{\"id\":\"notify-token-asset-required\",\"operation\":\"OBR.notification.show\",\"effect\":\"ui\",\"args\":{\"message\":\"I need a complete Owlbear token item or asset before I can add that token.\",\"variant\":\"WARNING\"}}]}",
    `Board state summary: ${boardStateSummary}`
  ].join("\n");
}
