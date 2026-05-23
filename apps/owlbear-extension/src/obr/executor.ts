import OBR from "@owlbear-rodeo/sdk";
import type { ObrDslEnvelope, ObrSagaStep } from "@bulette/shared";
import { validateEnvelope } from "@bulette/shared";
import { dispatchObrStep } from "./dispatcher";

export type ExecutionReport = {
  ok: boolean;
  sagaId: string;
  executedStepIds: string[];
  skippedStepIds: string[];
  warnings: string[];
  errors: string[];
  contextSummary: string[];
};

function resolveRefs<T>(value: T, ctx: Record<string, unknown>): T {
  if (typeof value === "string" && value.startsWith("$")) {
    const key = value.slice(1);
    return (ctx[key] as T) ?? value;
  }
  if (Array.isArray(value)) {
    return value.map((entry) => resolveRefs(entry, ctx)) as T;
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, entry]) => [key, resolveRefs(entry, ctx)])
    ) as T;
  }
  return value;
}

function canWrite(step: ObrSagaStep): boolean {
  return step.effect === "write" || step.effect === "broadcast";
}

type GridContext = {
  dpi: number;
  scaleMultiplier: number;
};

function normalizeStep(step: ObrSagaStep, grid?: GridContext): ObrSagaStep {
  if (
    (step.operation === "OBR.scene.items.updateItems" || step.operation === "OBR.scene.local.updateItems") &&
    Array.isArray((step.args as Record<string, unknown> | undefined)?.items)
  ) {
    const args = step.args as Record<string, unknown>;
    const items = args.items as Array<Record<string, unknown>>;
    if (items.length === 1 && typeof items[0]?.id === "string") {
      const { id, ...patch } = items[0];
      const restArgs = Object.fromEntries(Object.entries(args).filter(([key]) => key !== "items"));
      return {
        ...step,
        args: {
          ...restArgs,
          itemIds: [id],
          patch
        }
      };
    }
  }

  if (
    step.operation === "OBR.scene.items.updateItems" &&
    grid &&
    typeof (step.args as Record<string, unknown> | undefined)?.moveByDistance === "number" &&
    typeof (step.args as Record<string, unknown> | undefined)?.direction === "string"
  ) {
    const args = step.args as Record<string, unknown>;
    const distance = args.moveByDistance as number;
    const direction = String(args.direction).toLowerCase();
    const pixels = distance / grid.scaleMultiplier * grid.dpi;
    const delta =
      direction === "right" ? { x: pixels, y: 0 } :
      direction === "left" ? { x: -pixels, y: 0 } :
      direction === "down" ? { x: 0, y: pixels } :
      direction === "up" ? { x: 0, y: -pixels } :
      undefined;

    if (delta) {
      const patch = (args.patch as Record<string, unknown> | undefined) ?? {};
      return {
        ...step,
        args: {
          ...args,
          patch: {
            ...patch,
            delta,
            moveBy: true
          }
        }
      };
    }
  }

  return step;
}

function validateExecutableStep(step: ObrSagaStep): string | undefined {
  const args = (step.args ?? {}) as Record<string, unknown>;
  if (
    (step.operation === "OBR.scene.items.updateItems" || step.operation === "OBR.scene.local.updateItems") &&
    !args.patch
  ) {
    return `${step.id}: updateItems requires args.patch after normalization`;
  }
  return undefined;
}

function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

export async function executeObrSaga(input: unknown): Promise<ExecutionReport> {
  const validation = validateEnvelope(input);
  if (!validation.ok) {
    return {
      ok: false,
      sagaId: "invalid",
      executedStepIds: [],
      skippedStepIds: [],
      warnings: [],
      errors: validation.errors,
      contextSummary: []
    };
  }

  const envelope: ObrDslEnvelope = validation.data;
  const ctx: Record<string, unknown> = {};
  const executedStepIds: string[] = [];
  const skippedStepIds: string[] = [];
  const warnings: string[] = [];
  const errors: string[] = [];

  const role = envelope.actor.role ?? (await OBR.player.getRole());
  const [ready, sceneItems, gridDpi, gridScale] = await Promise.all([
    OBR.scene.isReady(),
    OBR.scene.items.getItems(),
    OBR.scene.grid.getDpi(),
    OBR.scene.grid.getScale()
  ]);
  const grid = { dpi: gridDpi, scaleMultiplier: gridScale.parsed.multiplier };
  const sceneItemIds = new Set(sceneItems.map((item) => item.id));
  const dryRun = envelope.mode === "read" || envelope.mode === "plan";

  for (const rawStep of envelope.steps) {
    const step = normalizeStep(rawStep, grid);
    if (step.guard?.requireSceneReady && !ready) {
      skippedStepIds.push(step.id);
      warnings.push(`${step.id}: scene not ready`);
      continue;
    }

    if (step.guard?.requireRole && step.guard.requireRole !== role) {
      skippedStepIds.push(step.id);
      warnings.push(`${step.id}: role mismatch`);
      continue;
    }

    if (envelope.safety.requireGmForWrites && canWrite(step) && role !== "GM") {
      skippedStepIds.push(step.id);
      errors.push(`${step.id}: write denied for non-GM`);
      continue;
    }

    if (!envelope.safety.allowNetworkBroadcast && step.effect === "broadcast") {
      skippedStepIds.push(step.id);
      errors.push(`${step.id}: broadcast disabled by safety policy`);
      continue;
    }

    if (!envelope.safety.allowSceneUpload && (step.operation === "OBR.assets.uploadImages" || step.operation === "OBR.assets.uploadScenes")) {
      skippedStepIds.push(step.id);
      errors.push(`${step.id}: asset upload disabled by safety policy`);
      continue;
    }

    if (!envelope.safety.allowAssetPicker && step.operation.startsWith("OBR.assets.")) {
      skippedStepIds.push(step.id);
      errors.push(`${step.id}: asset operations disabled by safety policy`);
      continue;
    }

    if (!envelope.safety.allowViewportControl && (step.operation === "OBR.viewport.setPosition" || step.operation === "OBR.viewport.setScale")) {
      skippedStepIds.push(step.id);
      errors.push(`${step.id}: viewport control disabled by safety policy`);
      continue;
    }

    if (step.operation === "OBR.room.setMetadata") {
      skippedStepIds.push(step.id);
      errors.push(`${step.id}: room metadata writes disabled by safety policy`);
      continue;
    }

    if (envelope.safety.maxItemsAffected && Array.isArray((step.args as Record<string, unknown>)?.itemIds)) {
      const count = ((step.args as Record<string, unknown>).itemIds as unknown[]).length;
      if (count > envelope.safety.maxItemsAffected) {
        skippedStepIds.push(step.id);
        errors.push(`${step.id}: item count ${count} exceeds maxItemsAffected`);
        continue;
      }
    }

    if (Array.isArray((step.args as Record<string, unknown>)?.itemIds)) {
      const missing = ((step.args as Record<string, unknown>).itemIds as string[]).filter((itemId) => !sceneItemIds.has(itemId));
      if (missing.length > 0) {
        skippedStepIds.push(step.id);
        errors.push(`${step.id}: unknown itemIds ${missing.join(", ")}`);
        continue;
      }
    }

    if (dryRun && canWrite(step)) {
      skippedStepIds.push(step.id);
      warnings.push(`${step.id}: skipped in dry-run mode`);
      continue;
    }

    const executableError = validateExecutableStep(step);
    if (executableError) {
      skippedStepIds.push(step.id);
      errors.push(executableError);
      continue;
    }

    try {
      const resolvedStep: ObrSagaStep = {
        ...step,
        args: resolveRefs(step.args, ctx)
      };
      const result = await dispatchObrStep(resolvedStep, ctx);
      if ((result as { error?: unknown })?.error) {
        throw new Error(JSON.stringify((result as { error: unknown }).error));
      }
      if (step.saveAs) ctx[step.saveAs] = result;
      executedStepIds.push(step.id);
    } catch (error) {
      errors.push(`${step.id}: ${formatError(error)}`);
      for (const compensating of [...envelope.steps].reverse()) {
        if (compensating.id === step.id) continue;
        if (compensating.compensate?.type === "custom") {
          try {
            await dispatchObrStep(compensating.compensate.step, ctx);
          } catch {
            warnings.push(`compensation failed for ${compensating.id}`);
          }
        }
      }
      break;
    }
  }

  return {
    ok: errors.length === 0,
    sagaId: envelope.sagaId,
    executedStepIds,
    skippedStepIds,
    warnings,
    errors,
    contextSummary: Object.keys(ctx)
  };
}
