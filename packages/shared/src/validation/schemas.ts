import { z } from "zod";
import { OBR_OPERATIONS } from "../types/dsl";

export const operationSchema = z.enum(OBR_OPERATIONS);

export const guardSchema = z.object({
  requireSceneReady: z.boolean().optional(),
  requireRole: z.enum(["GM", "PLAYER"]).optional(),
  requireConfirmation: z.boolean().optional(),
  maxItemsAffected: z.number().int().positive().optional(),
  allowedEffects: z.array(z.enum(["read", "write", "subscribe", "ui", "broadcast", "interaction"]).readonly()).optional()
});

export const compensationSchema: z.ZodTypeAny = z.lazy(() =>
  z.union([
    z.object({ type: z.literal("none") }),
    z.object({ type: z.literal("restoreSnapshot"), snapshotRef: z.string().min(1) }),
    z.object({ type: z.literal("deleteCreatedItems"), itemIdsRef: z.string().min(1) }),
    z.object({ type: z.literal("reverseMetadataPatch"), targetRef: z.string().min(1) }),
    z.object({ type: z.literal("custom"), step: sagaStepSchema })
  ])
);

export const sagaStepSchema: z.ZodTypeAny = z.lazy(() =>
  z.object({
    id: z.string().min(1),
    label: z.string().optional(),
    operation: operationSchema,
    args: z.record(z.string(), z.unknown()).optional(),
    effect: z.enum(["read", "write", "subscribe", "ui", "broadcast", "interaction"]),
    saveAs: z.string().optional(),
    uses: z.array(z.string()).optional(),
    compensate: compensationSchema.optional(),
    guard: guardSchema.optional()
  })
);

export const envelopeSchema = z.object({
  version: z.literal("obr-dsl/v1"),
  sagaId: z.string().min(1),
  mode: z.enum(["read", "plan", "preview", "apply", "rollback"]),
  actor: z.object({
    playerId: z.string().optional(),
    role: z.enum(["GM", "PLAYER"]).optional(),
    connectionId: z.string().optional()
  }),
  safety: z.object({
    requireGmForWrites: z.boolean(),
    requireConfirmation: z.boolean(),
    allowNetworkBroadcast: z.boolean(),
    allowAssetPicker: z.boolean(),
    allowSceneUpload: z.boolean(),
    allowViewportControl: z.boolean(),
    maxItemsAffected: z.number().int().positive().optional()
  }),
  steps: z.array(sagaStepSchema).min(1)
});

export const tacticalMutationSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("moveToken"), itemId: z.string().min(1), to: z.object({ x: z.number(), y: z.number() }), snapToGrid: z.boolean().optional(), maxDistance: z.number().positive().optional() }),
  z.object({ type: z.literal("moveTokenBy"), itemId: z.string().min(1), delta: z.object({ x: z.number(), y: z.number() }), snapToGrid: z.boolean().optional() }),
  z.object({ type: z.literal("setTokenVisibility"), itemId: z.string().min(1), visible: z.boolean() }),
  z.object({ type: z.literal("setTokenCondition"), itemId: z.string().min(1), condition: z.string().min(1), enabled: z.boolean(), duration: z.object({ amount: z.number().int().positive(), unit: z.enum(["turn", "round", "scene"]) }).optional() }),
  z.object({ type: z.literal("setTokenHp"), itemId: z.string().min(1), hp: z.object({ current: z.number(), max: z.number().optional() }) }),
  z.object({ type: z.literal("damageToken"), itemId: z.string().min(1), amount: z.number().positive(), damageType: z.string().optional() }),
  z.object({ type: z.literal("healToken"), itemId: z.string().min(1), amount: z.number().positive() }),
  z.object({ type: z.literal("markTarget"), sourceId: z.string().optional(), targetId: z.string().min(1), label: z.string().optional() }),
  z.object({ type: z.literal("createAoeMarker"), name: z.string().min(1), center: z.object({ x: z.number(), y: z.number() }), radiusFt: z.number().positive().optional(), shape: z.enum(["circle", "square", "cone", "line"]).optional() }),
  z.object({ type: z.literal("advanceInitiative"), encounterId: z.string().optional(), fromIndex: z.number().int().nonnegative(), toIndex: z.number().int().nonnegative(), roundDelta: z.number().int().optional() })
]);
