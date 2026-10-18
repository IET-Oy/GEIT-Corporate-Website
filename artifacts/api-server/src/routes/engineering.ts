import { Router } from "express";
import { CreateEngineeringScenarioBody, SaveEngineeringProjectBody, CreateEmissionFactorBody, ExplainEngineeringScenarioBody, type EngineeringModule } from "@workspace/api-zod";
import { identity, PlatformError, type Identity } from "../lib/platform-session";
import { calculateEngineering, ENGINEERING_MODELS } from "../lib/engineering";
import { inputHash, signScenario, verifyScenario } from "../lib/engineering/integrity";
import { exportEngineeringReport } from "../lib/engineering/reports";
import { validateFactor } from "../lib/sustainability/carbon";
import { resolveCarbon, resolveTwin, FACTOR_FIELDS, factorEntity } from "../lib/sustainability/resolve";
import { aiStatus, explain } from "../lib/sustainability/ai";

const router = Router({ mergeParams: true });
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const PROJECT_FIELDS = "id,module,name,facility,brief,currency,status,archived,created_at";
const aiRequests = new Map<string, { start: number; count: number }>();
type Context = Identity & { org: string; module: EngineeringModule };
function dbError(error: { code?: string; message?: string } | null) {
  if (!error) return;
  if (error.code === "42501") throw new PlatformError(403, "Your role cannot modify engineering records.");
  if (error.code === "22023") {
    const allowed = ["Project currency is locked after the first saved scenario", "Project changed. Reload before saving a scenario", "Project not available"];
    throw new PlatformError(400, allowed.includes(error.message || "") ? error.message! : "Invalid project or scenario.");
  }
  if (["23503", "23514", "23502"].includes(error.code || "")) throw new PlatformError(400, "Check project references, required fields and allowed values.");
  throw new PlatformError(503, "Engineering records are temporarily unavailable.");
}
router.use(async (req, res, next) => {
  const org = String(req.params.orgId), module = String(req.params.module);
  if (!UUID.test(org) || !Object.hasOwn({ ...ENGINEERING_MODELS, "carbon-footprint": "carbon", "digital-energy": "twin" }, module)) throw new PlatformError(400, "Invalid organisation or engineering module.");
  const current = await identity(req, res);
  const role = await current.client.rpc("geit_role", { org }); dbError(role.error);
  if (!role.data) throw new PlatformError(403, "This organisation is not available to your account.");
  const evidenceRead = req.method === "POST" && /^\/scenarios\/[a-f0-9-]{36}\/ai\/?$/i.test(req.path);
  if (req.method !== "GET" && !evidenceRead && role.data === "reader") throw new PlatformError(403, "Readers can view reports but cannot change projects or scenarios.");
  res.locals.engineering = { ...current, org, module }; next();
});
async function entity(c: Context, table: "projects" | "scenarios", id: string) {
  if (!UUID.test(id)) throw new PlatformError(400, "Invalid record ID.");
  const query = c.client.from(`geit_engineering_${table}`).select("*")
    .eq("organisation_id", c.org).eq("module", c.module).eq("id", id);
  const result = await query.maybeSingle(); dbError(result.error);
  if (!result.data) throw new PlatformError(404, "Record not found in this organisation and module.");
  return table === "projects" ? Object.fromEntries(PROJECT_FIELDS.split(",").map((key) => [key, result.data[key]])) : result.data;
}
function signedPayload(c: Context, row: Record<string, any>) {
  return { organisation_id: c.org, module: c.module, project_id: row.project_id, name: row.name,
    inputs: row.inputs, result: row.result, project_snapshot: row.project_snapshot, input_hash: row.input_hash };
}
async function scenario(c: Context, id: string) {
  const row = await entity(c, "scenarios", id);
  if (!verifyScenario(signedPayload(c, row), row.signature) || inputHash(row.inputs) !== row.input_hash) {
    throw new PlatformError(409, "Saved scenario integrity check failed. No unverified result or report can be displayed.");
  }
  return { id: row.id, project_id: row.project_id, module: row.module, name: row.name, created_at: row.created_at,
    inputs: row.inputs, result: row.result, projectSnapshot: row.project_snapshot, inputHash: row.input_hash };
}
router.get("/", async (_req, res) => {
  const c: Context = res.locals.engineering;
  const [projects, scenarios] = await Promise.all([
    c.client.from("geit_engineering_projects").select(PROJECT_FIELDS).eq("organisation_id", c.org).eq("module", c.module).order("created_at", { ascending: false }).limit(251),
    c.client.from("geit_engineering_scenarios").select("id,name,project_id,module,created_at").eq("organisation_id", c.org).eq("module", c.module).order("created_at", { ascending: false }).limit(251),
  ]);
  dbError(projects.error); dbError(scenarios.error);
  if ((projects.data?.length || 0) > 250 || (scenarios.data?.length || 0) > 250) throw new PlatformError(400, "Current module list limit is 250 projects and 250 scenarios. Pagination is required before adding more records.");
  res.json({ projects: projects.data || [], scenarios: scenarios.data || [], externalDataStatus: "not_configured", aiStatus: aiStatus() });
});
router.get("/factors", async (_req, res) => {
  const c: Context = res.locals.engineering;
  if (c.module !== "carbon-footprint") throw new PlatformError(404, "Factor registry belongs to Carbon Footprint.");
  const result = await c.client.from("geit_emission_factors").select(FACTOR_FIELDS).eq("organisation_id", c.org).order("created_at", { ascending: false }).limit(501);
  dbError(result.error);
  if ((result.data?.length || 0) > 500) throw new PlatformError(400, "Factor registry list limit is 500 versions; pagination is required.");
  res.json((result.data || []).map(factorEntity));
});
router.post("/factors", async (req, res) => {
  const c: Context = res.locals.engineering;
  if (c.module !== "carbon-footprint") throw new PlatformError(404, "Factor registry belongs to Carbon Footprint.");
  const parsed = CreateEmissionFactorBody.strict().safeParse(req.body);
  if (!parsed.success) throw new PlatformError(400, "Complete factor source, geography, units, value, validity, scope, category and GWP basis.");
  try { validateFactor(parsed.data); } catch (e) { throw new PlatformError(400, e instanceof Error ? e.message : "Factor is invalid."); }
  const saved = await c.client.rpc("geit_create_emission_factor", { p_org: c.org, p_definition: parsed.data }); dbError(saved.error);
  const row = await c.client.from("geit_emission_factors").select(FACTOR_FIELDS).eq("organisation_id", c.org).eq("id", saved.data).single(); dbError(row.error);
  res.status(201).json(factorEntity(row.data!));
});
router.get("/sources", async (_req, res) => {
  const c: Context = res.locals.engineering;
  if (c.module !== "digital-energy") throw new PlatformError(404, "Source selector belongs to Digital Energy.");
  const [meters, sites] = await Promise.all([
    c.client.from("geit_energy_meters").select("*").eq("organisation_id", c.org).eq("is_demo", false).eq("archived", false).limit(501),
    c.client.from("geit_energy_sites").select("*").eq("organisation_id", c.org).eq("is_demo", false).eq("archived", false).limit(501),
  ]);
  dbError(meters.error); dbError(sites.error);
  if ((meters.data?.length || 0) > 500 || (sites.data?.length || 0) > 500) throw new PlatformError(400, "Source selector limit is 500 sites/meters.");
  res.json({ meters: meters.data, sites: sites.data, connectedProviderStatus: "not_configured", readingLimit: 10000 });
});
router.post("/projects", async (req, res) => {
  const c: Context = res.locals.engineering, body = SaveEngineeringProjectBody.strict().safeParse(req.body);
  if (!body.success) throw new PlatformError(400, "Enter a project name, facility, brief (10–4,000 characters), three-letter currency and valid status.");
  if (body.data.id) await entity(c, "projects", body.data.id);
  const saved = await c.client.rpc("geit_engineering_save_project", { p_org: c.org, p_module: c.module, p_payload: body.data });
  dbError(saved.error); res.json(await entity(c, "projects", saved.data));
});
router.post("/scenarios", async (req, res) => {
  const c: Context = res.locals.engineering, body = CreateEngineeringScenarioBody.strict().safeParse(req.body);
  if (!body.success) throw new PlatformError(400, body.error.issues.slice(0, 4).map((e) => `${e.path.join(".")}: ${e.message}`).join("; "));
  const name = body.data.name.trim();
  if (name.length < 2) throw new PlatformError(400, "Scenario name must contain at least two non-blank characters.");
  const project = await entity(c, "projects", body.data.projectId);
  if (project.archived) throw new PlatformError(400, "Restore this project before saving another scenario.");
  let calculated;
  try {
    const inputs = body.data.inputs;
    if (c.module === "carbon-footprint" && inputs.model === "carbon") calculated = { inputs, result: await resolveCarbon(c.client, c.org, inputs) };
    else if (c.module === "digital-energy" && inputs.model === "twin") calculated = { inputs, result: await resolveTwin(c.client, c.org, inputs) };
    else if (Object.hasOwn(ENGINEERING_MODELS, c.module)) calculated = calculateEngineering(c.module as keyof typeof ENGINEERING_MODELS, inputs, project.currency);
    else throw new PlatformError(400, "Scenario model does not match this module.");
  } catch (error) {
    if (error instanceof PlatformError) throw error;
    throw new PlatformError(400, error instanceof Error ? error.message : "Engineering input is invalid.");
  }
  const row = { project_id: project.id, name, inputs: calculated.inputs, result: calculated.result, project_snapshot: project, input_hash: inputHash(calculated.inputs) };
  const signature = signScenario(signedPayload(c, row));
  const saved = await c.client.rpc("geit_engineering_save_scenario", {
    p_org: c.org, p_module: c.module, p_project: project.id, p_payload: { ...row, signature },
  });
  dbError(saved.error); res.status(201).json(await scenario(c, saved.data));
});
router.get("/scenarios/:id", async (req, res) => res.json(await scenario(res.locals.engineering, String(req.params.id))));
router.post("/scenarios/:id/ai", async (req, res) => {
  const body = ExplainEngineeringScenarioBody.strict().safeParse(req.body);
  if (!body.success) throw new PlatformError(400, "Enter a question and explicitly consent to sharing selected evidence.");
  const saved = await scenario(res.locals.engineering, String(req.params.id));
  if (aiStatus() === "configured") {
    const key = String(res.locals.engineering.user.id), now = Date.now();
    let bucket = aiRequests.get(key);
    if (!bucket || now - bucket.start >= 60000) { bucket = { start: now, count: 0 }; aiRequests.set(key, bucket); }
    if (++bucket.count > 5) { res.set("Retry-After", "60"); throw new PlatformError(429, "AI requests are limited to five per account per minute."); }
    if (aiRequests.size > 10000) for (const [id, b] of aiRequests) if (now - b.start >= 60000) aiRequests.delete(id);
  }
  res.json(await explain(saved, body.data.question, body.data.consent));
});
router.get("/scenarios/:id/export/:format", async (req, res) => {
  const saved = await scenario(res.locals.engineering, String(req.params.id));
  await exportEngineeringReport(saved, String(req.params.format), res);
});
export default router;
