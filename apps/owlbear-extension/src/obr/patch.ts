import { EXT_ID } from "./constants";

type SafePatch = Record<string, unknown>;

const ALLOWED_ITEM_KEYS = new Set(["name", "position", "rotation", "scale", "visible", "locked", "layer", "metadata"]);
const FORBIDDEN_KEYS = new Set(["__proto__", "constructor", "prototype"]);

function hasForbiddenKeys(value: unknown): boolean {
  if (!value || typeof value !== "object") {
    return false;
  }

  for (const key of Object.keys(value as object)) {
    if (FORBIDDEN_KEYS.has(key)) return true;
    if (hasForbiddenKeys((value as Record<string, unknown>)[key])) return true;
  }

  return false;
}

export function applyItemPatch(item: Record<string, unknown>, patch: SafePatch): void {
  if (hasForbiddenKeys(patch)) {
    throw new Error("unsafePatchKeys");
  }

  if (patch.moveBy === true && patch.delta && typeof patch.delta === "object") {
    const current = (item.position as { x?: number; y?: number } | undefined) ?? {};
    const delta = patch.delta as { x?: number; y?: number };
    item.position = {
      x: (current.x ?? 0) + (delta.x ?? 0),
      y: (current.y ?? 0) + (delta.y ?? 0)
    };
  }

  for (const [key, value] of Object.entries(patch)) {
    if (!ALLOWED_ITEM_KEYS.has(key)) continue;

    if (key === "metadata" && value && typeof value === "object") {
      const metadataPatch = value as Record<string, unknown>;
      for (const [metaKey, metaValue] of Object.entries(metadataPatch)) {
        if (!metaKey.startsWith(EXT_ID)) continue;
        const current = (item.metadata as Record<string, unknown> | undefined) ?? {};
        (item as Record<string, unknown>).metadata = {
          ...current,
          [metaKey]: metaValue
        };
      }
      continue;
    }

    (item as Record<string, unknown>)[key] = value;
  }
}
