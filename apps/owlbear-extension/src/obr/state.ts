import OBR from "@owlbear-rodeo/sdk";
import { COMBAT_META_KEY } from "./constants";

export async function extractBoardState() {
  const [ready, items, role, gridScale, gridType, gridMeasurement] = await Promise.all([
    OBR.scene.isReady(),
    OBR.scene.items.getItems(),
    OBR.player.getRole(),
    OBR.scene.grid.getScale(),
    OBR.scene.grid.getType(),
    OBR.scene.grid.getMeasurement()
  ]);

  return {
    sceneReady: ready,
    role,
    grid: { scale: gridScale, type: gridType, measurement: gridMeasurement },
    items: items.map((item) => ({
      id: item.id,
      name: item.name,
      layer: item.layer,
      position: item.position,
      rotation: item.rotation,
      scale: item.scale,
      visible: item.visible,
      locked: item.locked,
      metadata: item.metadata?.[COMBAT_META_KEY]
    }))
  };
}
