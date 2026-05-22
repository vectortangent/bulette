import type { ObrDslEnvelope } from "../types/dsl";
import { envelopeSchema } from "./schemas";

export function validateEnvelope(input: unknown): { ok: true; data: ObrDslEnvelope } | { ok: false; errors: string[] } {
  const result = envelopeSchema.safeParse(input);
  if (!result.success) {
    return {
      ok: false,
      errors: result.error.issues.map((issue) => `${issue.path.join(".") || "root"}: ${issue.message}`)
    };
  }
  return { ok: true, data: result.data as ObrDslEnvelope };
}
