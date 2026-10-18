import type { EngineeringInputs } from "@workspace/api-client-react";

export type Errors = Record<string, string>;
export type Builder = { current: (() => EngineeringInputs | null) | null };
export type SustainModule = "carbon-footprint" | "digital-energy";

export const SUSTAIN_PATH: Record<SustainModule, string> = { "carbon-footprint": "/app/carbon-footprint", "digital-energy": "/app/digital-energy" };

export const UNITS = ["kWh", "MWh", "GJ", "L", "m3", "kg", "km", "passenger_km", "tonne_km"] as const;
export const ENERGY_UNITS = ["kWh", "MWh", "GJ"];
export const SCOPES = ["scope1", "scope2", "scope3"] as const;
export const SCOPE_LABEL: Record<string, string> = { scope1: "Scope 1 (direct)", scope2: "Scope 2 (purchased energy)", scope3: "Scope 3 (value chain)" };
export const CATEGORIES: Record<string, string[]> = {
  scope1: ["stationary_combustion", "mobile_combustion", "fugitive", "process"],
  scope2: ["purchased_electricity", "purchased_heat"],
  scope3: ["purchased_goods", "upstream_fuel_energy", "waste", "business_travel", "employee_commuting", "upstream_transport", "downstream_transport"],
};
export const catLabel = (c: string) => c.replace(/_/g, " ");

/** Returns null for blank, NaN for invalid text, else the number. Blank is never coerced to 0. */
export function parseNum(raw: string): number | null {
  const t = raw.trim();
  if (!t) return null;
  if (!/^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i.test(t)) return NaN;
  return Number(t);
}
export function isDate(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}
export const INPUT = "form-input min-w-0";
