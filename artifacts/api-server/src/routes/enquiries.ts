import { Router, type IRouter } from "express";
import { db, enquiriesTable } from "@workspace/db";
import {
  CreateEnquiryBody,
  CreateEnquiryResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();
const rateLimitWindowMs = 10 * 60 * 1000;
const maxEnquiriesPerWindow = 5;
const enquiryAttempts = new Map<string, number[]>();

function isRateLimited(key: string, now: number): boolean {
  const recentAttempts = (enquiryAttempts.get(key) ?? []).filter(
    (attempt) => now - attempt < rateLimitWindowMs,
  );

  if (recentAttempts.length >= maxEnquiriesPerWindow) {
    enquiryAttempts.set(key, recentAttempts);
    return true;
  }

  recentAttempts.push(now);
  enquiryAttempts.set(key, recentAttempts);

  if (enquiryAttempts.size > 1000) {
    for (const [entryKey, attempts] of enquiryAttempts.entries()) {
      if (attempts.every((attempt) => now - attempt >= rateLimitWindowMs)) {
        enquiryAttempts.delete(entryKey);
      }
    }
  }

  return false;
}

router.post("/enquiries", async (req, res): Promise<void> => {
  const clientKey = req.ip || req.socket.remoteAddress || "unknown";
  if (isRateLimited(clientKey, Date.now())) {
    res.status(429).json({
      error: "Too many enquiries were submitted. Please try again later.",
    });
    return;
  }

  const parsed = CreateEnquiryBody.safeParse(req.body);
  if (!parsed.success) {
    req.log.warn(
      { fields: parsed.error.issues.map((issue) => issue.path.join(".")) },
      "Invalid consultation enquiry",
    );
    res.status(400).json({
      error: "Please check the enquiry details and try again.",
    });
    return;
  }

  if (parsed.data.website?.trim()) {
    req.log.warn("Rejected consultation enquiry by spam honeypot");
    res.status(400).json({
      error: "The enquiry could not be accepted. Please review the form and try again.",
    });
    return;
  }

  try {
    const [savedEnquiry] = await db
      .insert(enquiriesTable)
      .values({
        fullName: parsed.data.fullName.trim(),
        organization: parsed.data.organization.trim(),
        businessEmail: parsed.data.businessEmail.trim().toLowerCase(),
        telephone: parsed.data.telephone?.trim() || null,
        country: parsed.data.country.trim(),
        serviceOfInterest: parsed.data.serviceOfInterest,
        projectDescription: parsed.data.projectDescription.trim(),
        preferredContactMethod: parsed.data.preferredContactMethod || null,
        privacyConsent: parsed.data.privacyConsent,
      })
      .returning({
        id: enquiriesTable.id,
        createdAt: enquiriesTable.createdAt,
      });

    if (!savedEnquiry) {
      req.log.error("Consultation enquiry insert returned no record");
      res.status(500).json({ error: "We could not accept the enquiry. Please try again." });
      return;
    }

    const receipt = CreateEnquiryResponse.parse({
      accepted: true,
      reference: `GEIT-${savedEnquiry.createdAt.getUTCFullYear()}-${String(savedEnquiry.id).padStart(6, "0")}`,
      receivedAt: savedEnquiry.createdAt,
    });
    res.status(201).json(receipt);
  } catch (error) {
    req.log.error({ err: error }, "Failed to save consultation enquiry");
    res.status(500).json({
      error: "We could not accept the enquiry right now. Please try again later.",
    });
  }
});

export default router;
