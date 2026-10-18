import { createHash, createHmac, timingSafeEqual } from "node:crypto";
export function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map((k) => `${JSON.stringify(k)}:${canonical((value as Record<string, unknown>)[k])}`).join(",")}}`;
  return JSON.stringify(value);
}
export function inputHash(inputs: unknown) { return createHash("sha256").update(canonical(inputs)).digest("hex"); }
function key() {
  const value = process.env.SESSION_SECRET;
  if (!value || value.length < 16) throw new Error("Engineering signing configuration is unavailable.");
  return value;
}
export function signScenario(payload: unknown) {
  return createHmac("sha256", key()).update(`GEIT-engineering-scenario-v1\n${canonical(payload)}`).digest("hex");
}
export function verifyScenario(payload: unknown, signature: string) {
  if (!/^[a-f0-9]{64}$/.test(signature || "")) return false;
  return timingSafeEqual(Buffer.from(signature, "hex"), Buffer.from(signScenario(payload), "hex"));
}
