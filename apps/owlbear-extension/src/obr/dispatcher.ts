import OBR, { buildImage, buildImageUpload, buildText } from "@owlbear-rodeo/sdk";
import type { ObrSagaStep } from "@bulette/shared";
import { SCHEMA_VERSION, MessageType } from "@bulette/shared";
import { applyItemPatch } from "./patch";

function requestImageGeneration(prompt: string, model?: string, size?: string): Promise<{ ok: boolean; b64?: string; revisedPrompt?: string; errors?: string[] }> {
  return new Promise((resolve) => {
    const requestId = crypto.randomUUID();
    const handler = (event: MessageEvent) => {
      const msg = event.data;
      if (!msg || msg.schemaVersion !== SCHEMA_VERSION) return;
      if (msg.type !== MessageType.GENERATE_IMAGE_RESPONSE) return;
      if (msg.requestId !== requestId) return;
      window.removeEventListener("message", handler);
      resolve(msg.payload ?? { ok: false, errors: ["No response payload"] });
    };
    window.addEventListener("message", handler);
    window.parent.postMessage({
      schemaVersion: SCHEMA_VERSION,
      type: MessageType.GENERATE_IMAGE_REQUEST,
      requestId,
      payload: { prompt, model, size }
    }, "*");
    setTimeout(() => {
      window.removeEventListener("message", handler);
      resolve({ ok: false, errors: ["Image generation request timed out"] });
    }, 60000);
  });
}

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

function getInteractionManager(ctx: Record<string, unknown>, ref: unknown): [((update: (draft: any) => void) => unknown), (() => void)] | undefined {
  const manager = ctx[String(ref ?? "lastInteraction")];
  return Array.isArray(manager) && typeof manager[0] === "function" && typeof manager[1] === "function"
    ? manager as [((update: (draft: any) => void) => unknown), (() => void)]
    : undefined;
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
    case "OBR.scene.items.getItemAttachments":
      return obr.scene.items.getItemAttachments((args.itemIds as string[]) ?? []);
    case "OBR.scene.items.getItemBounds":
      return obr.scene.items.getItemBounds((args.itemIds as string[]) ?? []);
    case "OBR.scene.items.updateItems":
      return obr.scene.items.updateItems((args.itemIds as string[]) ?? [], (items: Record<string, unknown>[]) => {
        for (const item of items) applyItemPatch(item, (args.patch as Record<string, unknown>) ?? {});
      });
    case "OBR.scene.local.getItems":
      return obr.scene.local.getItems();
    case "OBR.scene.local.addItems":
      return obr.scene.local.addItems(((args.items as unknown[]) ?? []).map(normalizeAddItem));
    case "OBR.scene.local.deleteItems":
      return obr.scene.local.deleteItems((args.itemIds as string[]) ?? []);
    case "OBR.scene.local.getItemAttachments":
      return obr.scene.local.getItemAttachments((args.itemIds as string[]) ?? []);
    case "OBR.scene.local.getItemBounds":
      return obr.scene.local.getItemBounds((args.itemIds as string[]) ?? []);
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
      return obr.scene.grid.snapPosition(args.position, args.snappingSensitivity, args.useCorners, args.useCenter);
    case "OBR.scene.grid.getDistance":
      return obr.scene.grid.getDistance(args.from, args.to);
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
      return obr.room.id;
    case "OBR.room.getPermissions":
      return obr.room.getPermissions();
    case "OBR.room.getMetadata":
      return obr.room.getMetadata();
    case "OBR.room.setMetadata":
      return obr.room.setMetadata(args.metadata ?? {});
    case "OBR.broadcast.sendMessage":
      return obr.broadcast.sendMessage(String(args.channel ?? ""), args.data ?? args.message, args.options);
    case "OBR.notification.show":
      if (typeof args.waitMs === "number") {
        await new Promise((resolve) => window.setTimeout(resolve, Math.max(0, args.waitMs as number)));
        return { waitedMs: Math.max(0, args.waitMs as number) };
      }
      return obr.notification.show(String(args.message ?? ""), args.variant ?? "INFO");
    case "OBR.notification.close":
      return obr.notification.close(args.id);
    case "OBR.action.open":
      return obr.action.open();
    case "OBR.action.close":
      return obr.action.close();
    case "OBR.action.isOpen":
      return obr.action.isOpen();
    case "OBR.action.getTitle":
      return obr.action.getTitle();
    case "OBR.action.setTitle":
      return obr.action.setTitle(args.title);
    case "OBR.action.getIcon":
      return obr.action.getIcon();
    case "OBR.action.setIcon":
      return obr.action.setIcon(args.icon);
    case "OBR.action.getBadgeText":
      return obr.action.getBadgeText();
    case "OBR.action.setBadgeText":
      return obr.action.setBadgeText(args.text);
    case "OBR.action.getBadgeBackgroundColor":
      return obr.action.getBadgeBackgroundColor();
    case "OBR.action.setBadgeBackgroundColor":
      return obr.action.setBadgeBackgroundColor(args.color);
    case "OBR.action.getWidth":
      return obr.action.getWidth();
    case "OBR.action.setWidth":
      return obr.action.setWidth(args.width);
    case "OBR.action.getHeight":
      return obr.action.getHeight();
    case "OBR.action.setHeight":
      return obr.action.setHeight(args.height);
    case "OBR.tool.create":
      return obr.tool.create(args.tool);
    case "OBR.tool.remove":
      return obr.tool.remove(args.id);
    case "OBR.tool.activateTool":
      return obr.tool.activateTool(args.id);
    case "OBR.tool.getActiveTool":
      return obr.tool.getActiveTool();
    case "OBR.tool.getMetadata":
      return obr.tool.getMetadata(args.id);
    case "OBR.tool.setMetadata":
      return obr.tool.setMetadata(args.toolId ?? args.id, args.metadata ?? {});
    case "OBR.tool.createAction":
      return obr.tool.createAction(args.action);
    case "OBR.tool.removeAction":
      return obr.tool.removeAction(args.id);
    case "OBR.tool.createMode":
      return obr.tool.createMode(args.mode);
    case "OBR.tool.removeMode":
      return obr.tool.removeMode(args.id);
    case "OBR.tool.activateMode":
      return obr.tool.activateMode(args.toolId, args.modeId);
    case "OBR.tool.getActiveToolMode":
      return obr.tool.getActiveToolMode();
    case "OBR.modal.open":
      return obr.modal.open(args.modal);
    case "OBR.modal.close":
      return obr.modal.close(args.id);
    case "OBR.popover.open":
      return obr.popover.open(args.popover);
    case "OBR.popover.close":
      return obr.popover.close(args.id);
    case "OBR.popover.getWidth":
      return obr.popover.getWidth(args.id);
    case "OBR.popover.setWidth":
      return obr.popover.setWidth(args.id, args.width);
    case "OBR.popover.getHeight":
      return obr.popover.getHeight(args.id);
    case "OBR.popover.setHeight":
      return obr.popover.setHeight(args.id, args.height);
    case "OBR.viewport.reset":
      return obr.viewport.reset();
    case "OBR.viewport.animateTo":
      return obr.viewport.animateTo(args.transform);
    case "OBR.viewport.animateToBounds":
      return obr.viewport.animateToBounds(args.bounds);
    case "OBR.viewport.getPosition":
      return obr.viewport.getPosition();
    case "OBR.viewport.setPosition":
      return obr.viewport.setPosition(args.position);
    case "OBR.viewport.getScale":
      return obr.viewport.getScale();
    case "OBR.viewport.setScale":
      return obr.viewport.setScale(args.scale);
    case "OBR.viewport.getWidth":
      return obr.viewport.getWidth();
    case "OBR.viewport.getHeight":
      return obr.viewport.getHeight();
    case "OBR.viewport.transformPoint":
      return obr.viewport.transformPoint(args.point);
    case "OBR.viewport.inverseTransformPoint":
      return obr.viewport.inverseTransformPoint(args.point);
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
    case "OBR.scene.history.undo":
      return obr.scene.history.undo();
    case "OBR.scene.history.redo":
      return obr.scene.history.redo();
    case "OBR.scene.history.canUndo":
      return obr.scene.history.canUndo();
    case "OBR.scene.history.canRedo":
      return obr.scene.history.canRedo();
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
    case "OBR.assets.downloadScenes":
      return obr.assets.downloadScenes(args.multiple, args.defaultSearch);
    case "OBR.assets.uploadImages":
      return obr.assets.uploadImages(args.images ?? [], args.typeHint);
    case "OBR.assets.uploadScenes":
      return obr.assets.uploadScenes(args.scenes ?? [], args.disableShowScenes);
    case "OBR.interaction.startItemInteraction":
      {
        let baseState = args.baseState;
        if (!baseState && Array.isArray(args.itemIds)) {
          const sceneItems = await obr.scene.items.getItems();
          const ids = new Set(args.itemIds as string[]);
          baseState = sceneItems.filter((item: { id: string }) => ids.has(item.id));
        }
        const manager = await obr.interaction.startItemInteraction(baseState ?? []);
        const ref = String(step.saveAs ?? args.interactionRef ?? "lastInteraction");
        ctx[ref] = manager;
        return step.saveAs ? manager : { interactionRef: ref };
      }
    case "OBR.interaction.updateItemInteraction":
      {
        const manager = getInteractionManager(ctx, args.interactionRef);
        if (!manager) return { error: { code: "missingInteraction", message: "No interaction manager found" } };
        const patch = (args.patch as Record<string, unknown>) ?? {};
        const state = manager[0]((draft: any) => {
          if (Array.isArray(draft)) {
            for (const item of draft) applyItemPatch(item, patch);
          } else {
            applyItemPatch(draft, patch);
          }
        });
        return { state };
      }
    case "OBR.interaction.stopItemInteraction":
      {
        const ref = String(args.interactionRef ?? "lastInteraction");
        const manager = getInteractionManager(ctx, ref);
        if (!manager) return { error: { code: "missingInteraction", message: "No interaction manager found" } };
        manager[1]();
        delete ctx[ref];
        return { stopped: ref };
      }
    case "OBR.interaction.animateItemAlongPath":
      {
        const itemId = args.itemId as string;
        if (!itemId) return { error: { code: "missingItemId", message: "itemId is required" } };
        const sceneItems = await obr.scene.items.getItems();
        const item = sceneItems.find((i: { id: string }) => i.id === itemId);
        if (!item) return { error: { code: "itemNotFound", message: `Item ${itemId} not found` } };

        const pathType = (args.path as string) ?? "circle";
        const duration = Math.min((args.duration as number) ?? 2000, 28000);
        const frameCount = Math.min(Math.max((args.frameCount as number) ?? 36, 4), 360);
        const rawRadius = (args.radius as number) ?? undefined;
        const rawRadiusFt = (args.radiusFt as number) ?? undefined;
        const returnToStart = (args.returnToStart as boolean) ?? true;

        let radius: number;
        if (rawRadius != null) {
          radius = rawRadius;
        } else if (rawRadiusFt != null) {
          const gridDpi = await obr.scene.grid.getDpi();
          const gridScale = await obr.scene.grid.getScale();
          radius = rawRadiusFt / gridScale.parsed.multiplier * gridDpi;
        } else {
          const gridDpi = await obr.scene.grid.getDpi();
          radius = gridDpi;
        }

        const startPos = { x: item.position.x, y: item.position.y };

        let points: Array<{ x: number; y: number }>;
        if (pathType === "circle") {
          const cx = (args.center as { x: number; y: number })?.x ?? startPos.x;
          const cy = (args.center as { x: number; y: number })?.y ?? (startPos.y - radius);
          points = [];
          for (let i = 0; i <= frameCount; i++) {
            const angle = Math.PI / 2 + (2 * Math.PI * i) / frameCount;
            points.push({
              x: cx + radius * Math.cos(angle),
              y: cy + radius * Math.sin(angle)
            });
          }
        } else if (pathType === "waypoints" && Array.isArray(args.waypoints)) {
          points = args.waypoints as Array<{ x: number; y: number }>;
        } else {
          return { error: { code: "invalidPath", message: `Unsupported path type: ${pathType}` } };
        }

        if (points.length < 2) return { error: { code: "invalidPath", message: "Path must have at least 2 points" } };

        const manager = await obr.interaction.startItemInteraction(item);
        const [update, stop] = manager;
        const frameDelay = duration / points.length;

        for (const point of points) {
          update((draft: any) => {
            if (Array.isArray(draft)) {
              draft[0].position = point;
            } else {
              draft.position = point;
            }
          });
          await new Promise(resolve => setTimeout(resolve, frameDelay));
        }

        if (returnToStart) {
          update((draft: any) => {
            if (Array.isArray(draft)) {
              draft[0].position = startPos;
            } else {
              draft.position = startPos;
            }
          });
        }

        stop();
        return { animated: true, path: pathType, frames: points.length, duration };
      }
    case "OBR.assets.generateAndUploadImage":
      {
        const prompt = args.prompt as string;
        if (!prompt) return { error: { code: "missingPrompt", message: "args.prompt is required" } };
        const model = args.model as string | undefined;
        const size = args.size as string | undefined;
        const name = (args.name as string) ?? "Generated Image";
        const typeHint = (args.typeHint as string) ?? "PROP";
        const addToScene = (args.addToScene as boolean) ?? false;
        const position = (args.position as { x: number; y: number }) ?? { x: 0, y: 0 };

        const genResult = await requestImageGeneration(prompt, model, size);
        if (!genResult.ok || !genResult.b64) {
          return { error: { code: "imageGenerationFailed", message: genResult.errors?.join("; ") ?? "Image generation failed" } };
        }

        const binaryString = atob(genResult.b64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: "image/png" });
        const file = new File([blob], `${name}.png`, { type: "image/png" });

        const upload = buildImageUpload(file).name(name).build();
        await obr.assets.uploadImages([upload], typeHint);

        if (addToScene) {
          const url = URL.createObjectURL(blob);
          const img = await new Promise<HTMLImageElement>((resolve, reject) => {
            const el = new Image();
            el.onload = () => resolve(el);
            el.onerror = reject;
            el.src = url;
          });
          const width = img.naturalWidth;
          const height = img.naturalHeight;
          URL.revokeObjectURL(url);

          const gridDpi = await obr.scene.grid.getDpi();
          const sceneItem = buildImage(
            { width, height, url: URL.createObjectURL(blob), mime: "image/png" },
            { dpi: gridDpi, offset: { x: 0, y: 0 } }
          )
            .name(name)
            .position(position)
            .layer(typeHint === "MAP" ? "MAP" : typeHint === "CHARACTER" ? "CHARACTER" : typeHint === "MOUNT" ? "MOUNT" : "PROP")
            .build();
          await obr.scene.items.addItems([sceneItem]);
        }

        return { generated: true, name, typeHint, addedToScene: addToScene, revisedPrompt: genResult.revisedPrompt };
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
