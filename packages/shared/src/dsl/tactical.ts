import type { ObrSagaStep, TacticalMutation } from "../types/dsl";

export function compileTacticalMutation(stepId: string, mutation: TacticalMutation): ObrSagaStep[] {
  switch (mutation.type) {
    case "moveToken":
      return [{
        id: stepId,
        operation: "OBR.scene.items.updateItems",
        effect: "write",
        args: {
          itemIds: [mutation.itemId],
          patch: { position: mutation.to },
          snapToGrid: mutation.snapToGrid ?? false,
          maxDistance: mutation.maxDistance
        }
      }];
    case "moveTokenBy":
      return [{
        id: stepId,
        operation: "OBR.scene.items.updateItems",
        effect: "write",
        args: {
          itemIds: [mutation.itemId],
          patch: { delta: mutation.delta, moveBy: true },
          snapToGrid: mutation.snapToGrid ?? false
        }
      }];
    case "setTokenVisibility":
      return [{
        id: stepId,
        operation: "OBR.scene.items.updateItems",
        effect: "write",
        args: { itemIds: [mutation.itemId], patch: { visible: mutation.visible } }
      }];
    case "setTokenCondition":
    case "setTokenHp":
    case "damageToken":
    case "healToken":
    case "markTarget":
    case "createAoeMarker":
    case "advanceInitiative":
      return [{
        id: stepId,
        operation: "OBR.scene.items.updateItems",
        effect: "write",
        args: { itemIds: mutation.type === "createAoeMarker" ? [] : ["unknown"], tactical: mutation }
      }];
  }
}
