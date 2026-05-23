import OBR from "@owlbear-rodeo/sdk";
import { COMBAT_META_KEY } from "./constants";

export async function extractBoardState() {
  const [ready, items, role, gridScale, gridType, gridMeasurement, gridDpi] = await Promise.all([
    OBR.scene.isReady(),
    OBR.scene.items.getItems(),
    OBR.player.getRole(),
    OBR.scene.grid.getScale(),
    OBR.scene.grid.getType(),
    OBR.scene.grid.getMeasurement(),
    OBR.scene.grid.getDpi()
  ]);

  return {
    sceneReady: ready,
    role,
    grid: { scale: gridScale, type: gridType, measurement: gridMeasurement, dpi: gridDpi },
    items: items.map((item) => {
      const base = {
        id: item.id,
        type: item.type,
        name: item.name,
        layer: item.layer,
        position: item.position,
        rotation: item.rotation,
        scale: item.scale,
        visible: item.visible,
        locked: item.locked,
        metadata: item.metadata?.[COMBAT_META_KEY]
      };
      const img = (item as { image?: { url?: string; width?: number; height?: number } }).image;
      if (img?.url) {
        return { ...base, image: { url: img.url, width: img.width, height: img.height } };
      }
      return base;
    })
  };
}
