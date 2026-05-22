export const OBR_OPERATIONS = [
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
] as const;

export type ObrOperation = (typeof OBR_OPERATIONS)[number];

export type ObrCompensation =
  | { type: "none" }
  | { type: "restoreSnapshot"; snapshotRef: string }
  | { type: "deleteCreatedItems"; itemIdsRef: string }
  | { type: "reverseMetadataPatch"; targetRef: string }
  | { type: "custom"; step: ObrSagaStep };

export type ObrGuard = {
  requireSceneReady?: boolean;
  requireRole?: "GM" | "PLAYER";
  requireConfirmation?: boolean;
  maxItemsAffected?: number;
  allowedEffects?: Array<"read" | "write" | "subscribe" | "ui" | "broadcast" | "interaction">;
};

export type ObrSagaStep = {
  id: string;
  label?: string;
  operation: ObrOperation;
  args?: Record<string, unknown>;
  effect: "read" | "write" | "subscribe" | "ui" | "broadcast" | "interaction";
  saveAs?: string;
  uses?: string[];
  compensate?: ObrCompensation;
  guard?: ObrGuard;
};

export type ObrDslEnvelope = {
  version: "obr-dsl/v1";
  sagaId: string;
  mode: "read" | "plan" | "preview" | "apply" | "rollback";
  actor: {
    playerId?: string;
    role?: "GM" | "PLAYER";
    connectionId?: string;
  };
  safety: {
    requireGmForWrites: boolean;
    requireConfirmation: boolean;
    allowNetworkBroadcast: boolean;
    allowAssetPicker: boolean;
    allowSceneUpload: boolean;
    allowViewportControl: boolean;
    maxItemsAffected?: number;
  };
  steps: ObrSagaStep[];
};

export type TacticalMutation =
  | { type: "moveToken"; itemId: string; to: { x: number; y: number }; snapToGrid?: boolean; maxDistance?: number }
  | { type: "moveTokenBy"; itemId: string; delta: { x: number; y: number }; snapToGrid?: boolean }
  | { type: "setTokenVisibility"; itemId: string; visible: boolean }
  | { type: "setTokenCondition"; itemId: string; condition: string; enabled: boolean; duration?: { amount: number; unit: "turn" | "round" | "scene" } }
  | { type: "setTokenHp"; itemId: string; hp: { current: number; max?: number } }
  | { type: "damageToken"; itemId: string; amount: number; damageType?: string }
  | { type: "healToken"; itemId: string; amount: number }
  | { type: "markTarget"; sourceId?: string; targetId: string; label?: string }
  | { type: "createAoeMarker"; name: string; center: { x: number; y: number }; radiusFt?: number; shape?: "circle" | "square" | "cone" | "line" }
  | { type: "advanceInitiative"; encounterId?: string; fromIndex: number; toIndex: number; roundDelta?: number };

export type CombatMetadata = {
  initiative?: number;
  hp?: { current: number; max: number };
  conditions?: string[];
  allegiance?: "party" | "enemy" | "neutral" | "unknown";
  movementFt?: number;
  actionAvailable?: boolean;
  bonusActionAvailable?: boolean;
  reactionAvailable?: boolean;
};
