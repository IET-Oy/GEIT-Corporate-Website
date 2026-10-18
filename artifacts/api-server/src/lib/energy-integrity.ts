import { createHmac, timingSafeEqual } from "node:crypto";
import { canonical } from "./engineering/integrity";
import { PlatformError } from "./platform-session";

function signature(payload: unknown) {
  const key = process.env.SESSION_SECRET;
  if (!key || key.length < 16) throw new PlatformError(503, "Analysis verification is not configured.");
  return createHmac("sha256", key).update(`GEIT-energy-analysis-v1\n${canonical(payload)}`).digest("hex");
}
export function signEnergyAnalysis(payload: unknown) { return signature(payload); }
export function verifyEnergyAnalysis(record: Record<string, any>) {
  const { authenticity, ...snapshot } = record.snapshot ?? {};
  const payload = { organisation_id: record.organisation_id, meter_id: record.meter_id,
    tariff_id: record.tariff_id ?? null, name: record.name, result: record.result, snapshot };
  if (typeof authenticity !== "string" || !/^[a-f0-9]{64}$/.test(authenticity) ||
    !timingSafeEqual(Buffer.from(authenticity, "hex"), Buffer.from(signature(payload), "hex"))) {
    throw new PlatformError(409, "This analysis cannot be verified. Its stored data has not been deleted. Create a new analysis from the meter readings before viewing or exporting results.");
  }
  return record;
}
