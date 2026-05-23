export const OBR_OPERATIONS = [
  "OBR.scene.isReady",
  "OBR.scene.getMetadata",
  "OBR.scene.setMetadata",
  "OBR.scene.items.getItems",
  "OBR.scene.items.addItems",
  "OBR.scene.items.updateItems",
  "OBR.scene.items.deleteItems",
  "OBR.scene.items.getItemAttachments",
  "OBR.scene.items.getItemBounds",
  "OBR.scene.items.onChange",
  "OBR.scene.local.getItems",
  "OBR.scene.local.addItems",
  "OBR.scene.local.updateItems",
  "OBR.scene.local.deleteItems",
  "OBR.scene.local.getItemAttachments",
  "OBR.scene.local.getItemBounds",
  "OBR.scene.local.onChange",
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
  "OBR.scene.history.undo",
  "OBR.scene.history.redo",
  "OBR.scene.history.canUndo",
  "OBR.scene.history.canRedo",
  "OBR.viewport.reset",
  "OBR.viewport.animateTo",
  "OBR.viewport.animateToBounds",
  "OBR.viewport.getPosition",
  "OBR.viewport.setPosition",
  "OBR.viewport.getScale",
  "OBR.viewport.setScale",
  "OBR.viewport.getWidth",
  "OBR.viewport.getHeight",
  "OBR.viewport.transformPoint",
  "OBR.viewport.inverseTransformPoint",
  "OBR.player.getId",
  "OBR.player.getName",
  "OBR.player.getRole",
  "OBR.player.getColor",
  "OBR.player.getConnectionId",
  "OBR.player.getMetadata",
  "OBR.player.setMetadata",
  "OBR.party.getPlayers",
  "OBR.room.getId",
  "OBR.room.getPermissions",
  "OBR.room.getMetadata",
  "OBR.room.setMetadata",
  "OBR.broadcast.sendMessage",
  "OBR.notification.close",
  "OBR.notification.show",
  "OBR.action.open",
  "OBR.action.close",
  "OBR.action.isOpen",
  "OBR.action.getTitle",
  "OBR.action.setTitle",
  "OBR.action.getIcon",
  "OBR.action.setIcon",
  "OBR.action.getBadgeText",
  "OBR.action.setBadgeText",
  "OBR.action.getBadgeBackgroundColor",
  "OBR.action.setBadgeBackgroundColor",
  "OBR.action.getWidth",
  "OBR.action.setWidth",
  "OBR.action.getHeight",
  "OBR.action.setHeight",
  "OBR.tool.create",
  "OBR.tool.remove",
  "OBR.tool.activateTool",
  "OBR.tool.getActiveTool",
  "OBR.tool.getMetadata",
  "OBR.tool.setMetadata",
  "OBR.tool.createAction",
  "OBR.tool.removeAction",
  "OBR.tool.createMode",
  "OBR.tool.removeMode",
  "OBR.tool.activateMode",
  "OBR.tool.getActiveToolMode",
  "OBR.modal.open",
  "OBR.modal.close",
  "OBR.popover.open",
  "OBR.popover.close",
  "OBR.popover.getWidth",
  "OBR.popover.setWidth",
  "OBR.popover.getHeight",
  "OBR.popover.setHeight",
  "OBR.assets.downloadImages",
  "OBR.assets.downloadScenes",
  "OBR.assets.uploadImages",
  "OBR.assets.uploadScenes",
  "OBR.interaction.startItemInteraction",
  "OBR.interaction.updateItemInteraction",
  "OBR.interaction.stopItemInteraction",
  "OBR.interaction.animateItemAlongPath"
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
    allowRoomMetadata?: boolean;
    allowToolControl?: boolean;
    allowModalControl?: boolean;
    allowPopoverControl?: boolean;
    allowInteractionControl?: boolean;
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
