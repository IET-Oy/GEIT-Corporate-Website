import type { ErrorRequestHandler } from "express";
import { logger } from "./logger";

export const httpErrors: ErrorRequestHandler = (error, _req, res, next) => {
  if (res.headersSent) return next(error);
  res.set({ "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" });
  if (error?.type === "entity.too.large") return void res.status(413).json({ error: "The request is too large. Reduce the file or request size." });
  if (error?.type === "entity.parse.failed") return void res.status(400).json({ error: "The request must contain valid JSON." });
  if (error?.status === 415) return void res.status(415).json({ error: "The request encoding is not supported." });
  logger.error({ category: "http_request_failed" }, "HTTP request failed");
  res.status(500).json({ error: "The service could not complete this request. Please try again." });
};
