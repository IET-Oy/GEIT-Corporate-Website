import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { httpErrors } from "./lib/http-errors";

const app: Express = express();
app.set("trust proxy", 1);
app.disable("x-powered-by");

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
// Authenticated application requests are same-origin only, without wildcard CORS.
app.use((req, res, next) => req.path.startsWith("/api/platform") ? next() : cors()(req, res, next));
app.use("/api/platform/energy/:orgId/imports", express.json({ limit: "4mb" }));
app.use("/api/platform/engineering/:orgId/:module/scenarios", express.json({ limit: "512kb" }));
app.use(express.json({ limit: "32kb" }));
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);
app.use("/api", (_req, res) => {
  res.set({ "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" }).status(404).json({ error: "API route not found." });
});
app.use(httpErrors);

export default app;
