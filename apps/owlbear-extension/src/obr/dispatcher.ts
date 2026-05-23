import OBR, { buildImage, buildText } from "@owlbear-rodeo/sdk";
import type { ObrSagaStep } from "@bulette/shared";
import { applyItemPatch } from "./patch";

type SimpleTextItem = {
  type?: string;
  text?: string;
  name?: string;
  position?: { x?: number; y?: number };
  layer?: string;
  fontSize?: number;
  color?: string;
  alignment?: string;
};

function normalizeAddItem(item: unknown): unknown {
  const simple = item as SimpleTextItem;
  if (simple?.type?.toLowerCase() !== "text" || typeof simple.text !== "string") {
    return item;
  }

  const align = simple.alignment?.toUpperCase() === "CENTER" ? "CENTER" : simple.alignment?.toUpperCase() === "RIGHT" ? "RIGHT" : "LEFT";
  return buildText()
    .name(simple.name ?? "Text")
    .plainText(simple.text)
    .textType("PLAIN")
    .fontSize(simple.fontSize ?? 24)
    .fillColor(simple.color ?? "#000000")
    .textAlign(align)
    .textAlignVertical("MIDDLE")
    .layer("TEXT")
    .position({ x: simple.position?.x ?? 0, y: simple.position?.y ?? 0 })
    .build();
}

export async function dispatchObrStep(step: ObrSagaStep, ctx: Record<string, unknown>): Promise<unknown> {
  const args = (step.args ?? {}) as Record<string, unknown>;
  const obr = OBR as unknown as Record<string, any>;

  switch (step.operation) {
    case "OBR.scene.isReady":
      return obr.scene.isReady();
    case "OBR.scene.getMetadata":
      return obr.scene.getMetadata();
    case "OBR.scene.setMetadata":
      return obr.scene.setMetadata(args.metadata ?? {});
    case "OBR.scene.items.getItems":
      return obr.scene.items.getItems();
    case "OBR.scene.items.addItems":
      return obr.scene.items.addItems(((args.items as unknown[]) ?? []).map(normalizeAddItem));
    case "OBR.scene.items.deleteItems":
      return obr.scene.items.deleteItems((args.itemIds as string[]) ?? []);
    case "OBR.scene.items.updateItems":
      return obr.scene.items.updateItems((args.itemIds as string[]) ?? [], (items: Record<string, unknown>[]) => {
        for (const item of items) applyItemPatch(item, (args.patch as Record<string, unknown>) ?? {});
      });
    case "OBR.scene.local.addItems":
      return obr.scene.local.addItems(((args.items as unknown[]) ?? []).map(normalizeAddItem));
    case "OBR.scene.local.deleteItems":
      return obr.scene.local.deleteItems((args.itemIds as string[]) ?? []);
    case "OBR.scene.local.updateItems":
      return obr.scene.local.updateItems((args.itemIds as string[]) ?? [], (items: Record<string, unknown>[]) => {
        for (const item of items) applyItemPatch(item, (args.patch as Record<string, unknown>) ?? {});
      });
    case "OBR.scene.grid.getDpi":
      return obr.scene.grid.getDpi();
    case "OBR.scene.grid.getScale":
      return obr.scene.grid.getScale();
    case "OBR.scene.grid.setScale":
      return obr.scene.grid.setScale(args.scale);
    case "OBR.scene.grid.getColor":
      return obr.scene.grid.getColor();
    case "OBR.scene.grid.setColor":
      return obr.scene.grid.setColor(args.color);
    case "OBR.scene.grid.getOpacity":
      return obr.scene.grid.getOpacity();
    case "OBR.scene.grid.setOpacity":
      return obr.scene.grid.setOpacity(args.opacity);
    case "OBR.scene.grid.getType":
      return obr.scene.grid.getType();
    case "OBR.scene.grid.setType":
      return obr.scene.grid.setType(args.type);
    case "OBR.scene.grid.getLineType":
      return obr.scene.grid.getLineType();
    case "OBR.scene.grid.setLineType":
      return obr.scene.grid.setLineType(args.lineType);
    case "OBR.scene.grid.getMeasurement":
      return obr.scene.grid.getMeasurement();
    case "OBR.scene.grid.setMeasurement":
      return obr.scene.grid.setMeasurement(args.measurement);
    case "OBR.scene.grid.getLineWidth":
      return obr.scene.grid.getLineWidth();
    case "OBR.scene.grid.setLineWidth":
      return obr.scene.grid.setLineWidth(args.lineWidth);
    case "OBR.scene.grid.snapPosition":
      return obr.scene.grid.snapPosition(args.position);
    case "OBR.scene.grid.getDistance":
      return obr.scene.grid.getDistance();
    case "OBR.player.getId":
      return obr.player.getId();
    case "OBR.player.getName":
      return obr.player.getName();
    case "OBR.player.getRole":
      return obr.player.getRole();
    case "OBR.player.getColor":
      return obr.player.getColor();
    case "OBR.player.getConnectionId":
      return obr.player.getConnectionId();
    case "OBR.player.getMetadata":
      return obr.player.getMetadata();
    case "OBR.player.setMetadata":
      return obr.player.setMetadata(args.metadata ?? {});
    case "OBR.party.getPlayers":
      return obr.party.getPlayers();
    case "OBR.room.getId":
      return obr.room.getId();
    case "OBR.room.getMetadata":
      return obr.room.getMetadata();
    case "OBR.room.setMetadata":
      return obr.room.setMetadata(args.metadata ?? {});
    case "OBR.broadcast.sendMessage":
      return obr.broadcast.sendMessage(args.channel, args.message);
    case "OBR.notification.show":
      return obr.notification.show(String(args.message ?? ""), args.variant ?? "INFO");
    case "OBR.action.open":
      return obr.action.open();
    case "OBR.action.close":
      return obr.action.close();
    case "OBR.action.isOpen":
      return obr.action.isOpen();
    case "OBR.action.setTitle":
      return obr.action.setTitle(args.title);
    case "OBR.action.setIcon":
      return obr.action.setIcon(args.icon);
    case "OBR.action.setBadgeText":
      return obr.action.setBadgeText(args.text);
    case "OBR.action.setSize":
      return obr.action.setSize(args.size);
    case "OBR.modal.open":
      return obr.modal.open(args.modal);
    case "OBR.modal.close":
      return obr.modal.close(args.id);
    case "OBR.popover.open":
      return obr.popover.open(args.popover);
    case "OBR.popover.close":
      return obr.popover.close(args.id);
    case "OBR.viewport.getPosition":
      return obr.viewport.getPosition();
    case "OBR.viewport.setPosition":
      return obr.viewport.setPosition(args.position);
    case "OBR.viewport.getScale":
      return obr.viewport.getScale();
    case "OBR.viewport.setScale":
      return obr.viewport.setScale(args.scale);
    case "OBR.scene.fog.getColor":
      return obr.scene.fog.getColor();
    case "OBR.scene.fog.setColor":
      return obr.scene.fog.setColor(args.color);
    case "OBR.scene.fog.getStrokeWidth":
      return obr.scene.fog.getStrokeWidth();
    case "OBR.scene.fog.setStrokeWidth":
      return obr.scene.fog.setStrokeWidth(args.strokeWidth);
    case "OBR.scene.fog.getFilled":
      return obr.scene.fog.getFilled();
    case "OBR.scene.fog.setFilled":
      return obr.scene.fog.setFilled(args.filled);
    case "OBR.assets.downloadImages":
      {
        const images = await obr.assets.downloadImages(args.multiple, args.defaultSearch, args.typeHint);
        if (args.addToScene && images[0]) {
          const image = images[0];
          const position = (args.position as { x?: number; y?: number } | undefined) ?? { x: 0, y: 0 };
          const item = buildImage(image.image, image.grid)
            .name(String(args.name ?? image.name))
            .text(image.text)
            .textItemType(image.textItemType)
            .visible(image.visible)
            .locked(image.locked)
            .rotation(image.rotation)
            .scale(image.scale)
            .layer("CHARACTER")
            .position({ x: position.x ?? 0, y: position.y ?? 0 })
            .build();
          await obr.scene.items.addItems([item]);
        }
        return images;
      }
    default:
      return {
        error: {
          code: "unsupportedOperation",
          message: `Unsupported operation: ${step.operation}`,
          stepId: step.id,
          availableContextKeys: Object.keys(ctx)
        }
      };
  }
}
