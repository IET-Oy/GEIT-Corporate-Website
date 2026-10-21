import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";
import { assertStagingConfiguration, signStagingChallenge } from "../lib/staging-isolation";

const router: IRouter = Router();

router.get("/healthz", (_req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
});

// No database, Auth or Storage request. Not available in the normal application.
router.get("/staging-isolation", (req, res) => {
  res.set({ "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" });
  if (process.env.GEIT_ENVIRONMENT !== "staging") {
    res.status(404).json({ error: "API route not found." });
    return;
  }
  const challenge = req.query.challenge;
  if (typeof challenge !== "string" || !/^[a-f0-9]{64}$/.test(challenge)) {
    res.status(400).json({ error: "A valid staging identity challenge is required." });
    return;
  }
  try {
    const identity = assertStagingConfiguration();
    res.json({
      ...identity, challenge,
      signature: signStagingChallenge(identity, challenge, process.env.SESSION_SECRET!),
    });
  } catch {
    res.status(503).json({ error: "Staging isolation is not verified." });
  }
});

export default router;
