import { CreateEngineeringScenarioBody } from "@workspace/api-zod";
import { consulting, auditing } from "./consulting-audit";
import { solar } from "./solar";
import { battery } from "./battery";
import { evCharging } from "./ev-charging";
import { ensureFinite } from "./common";
export const ENGINEERING_MODELS = {
  "energy-consulting": "consulting", "energy-auditing": "auditing", "renewable-energy": "solar", "battery-flexibility": "battery",
  "ev-charging": "ev-charging",
} as const;
export function calculateEngineering(module: keyof typeof ENGINEERING_MODELS, raw: unknown, currency: string) {
  if (!/^[A-Z]{3}$/.test(currency)) throw new Error("Currency must be a three-letter uppercase code.");
  const parsed = CreateEngineeringScenarioBody.shape.inputs.safeParse(raw);
  if (!parsed.success) throw new Error(parsed.error.issues.slice(0, 5).map((e) => `${e.path.join(".") || "inputs"}: ${e.message}`).join("; "));
  const i = parsed.data;
  if (!Object.hasOwn(ENGINEERING_MODELS, module) || ENGINEERING_MODELS[module] !== i.model) throw new Error("Scenario input model does not match this project module.");
  if (i.sourceNotes.trim().length < 10) throw new Error("Describe the source and quality of the entered engineering data (at least 10 non-blank characters).");
  const result = i.model === "consulting" ? consulting(i, currency) : i.model === "auditing" ? auditing(i, currency)
    : i.model === "solar" ? solar(i, currency) : i.model === "battery" ? battery(i, currency) : evCharging(i, currency);
  return { inputs: i, result: ensureFinite(result) };
}
