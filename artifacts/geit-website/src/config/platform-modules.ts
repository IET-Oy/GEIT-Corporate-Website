/**
 * Phase 1 route contract, not a list of operational tools.
 * Keep public service links unchanged until a module's authenticated flow ships.
 */
export const platformModules = [
  { id: "overview", title: "Overview", path: "/app", readiness: "planned" },
  { id: "energy-management", title: "Energy Management", path: "/app/energy-management", readiness: "planned" },
  { id: "energy-consulting", title: "Energy Consulting", path: "/app/energy-consulting", readiness: "planned" },
  { id: "renewable-energy", title: "Renewable Energy Advisory", path: "/app/renewable-energy", readiness: "planned" },
  { id: "energy-auditing", title: "Energy Efficiency & Auditing", path: "/app/energy-auditing", readiness: "planned" },
  { id: "battery-flexibility", title: "Battery Storage & Flexibility", path: "/app/battery-flexibility", readiness: "planned" },
  { id: "digital-energy", title: "AI & Digital Energy Solutions", path: "/app/digital-energy", readiness: "planned" },
  { id: "carbon-footprint", title: "Carbon Footprint", path: "/app/carbon-footprint", readiness: "planned" },
  { id: "projects-reports", title: "Projects and Reports", path: "/app/projects-reports", readiness: "planned" },
  { id: "organisation-settings", title: "Organisation Settings", path: "/app/organisation-settings", readiness: "planned" },
] as const;

export type PlatformModuleId = (typeof platformModules)[number]["id"];

/** Advisory services share consulting workflows; this does not promise eleven separate modelling engines. */
export const serviceModuleMap = {
  "energy-management": "energy-management",
  "energy-consulting": "energy-consulting",
  "energy-project-development": "energy-consulting",
  "energy-market-research": "energy-consulting",
  "energy-technology-solutions": "digital-energy",
  "renewable-energy-advisory": "renewable-energy",
  "energy-efficiency-auditing": "energy-auditing",
  "battery-energy-storage-flexibility": "battery-flexibility",
  "ev-charging-infrastructure": "energy-consulting",
  "ai-energy-analytics-digital-solutions": "digital-energy",
  "carbon-footprint-services": "carbon-footprint",
} as const satisfies Record<string, PlatformModuleId>;
