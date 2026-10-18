import { randomUUID } from "node:crypto";
import type { Identity } from "./platform-session";

export const PRIVATE_DOCUMENT_BUCKET = "geit-private-documents";
export const PRIVATE_DOCUMENT_MAX_BYTES = 10 * 1024 * 1024;
export const PRIVATE_DOCUMENT_TYPES = {
  pdf: "application/pdf", png: "image/png", jpg: "image/jpeg", csv: "text/csv",
} as const;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
export function privateDocumentKey(organisationId: string, extension: keyof typeof PRIVATE_DOCUMENT_TYPES) {
  if (!UUID.test(organisationId) || !Object.hasOwn(PRIVATE_DOCUMENT_TYPES, extension)) {
    throw new Error("Invalid private document namespace.");
  }
  return `${organisationId}/${randomUUID()}.${extension}`;
}

/** Call only after identity(req,res). The user's JWT keeps Storage RLS active.
 * Never use getPublicUrl or a service-role client for tenant documents.
 * Future file-intake routes must validate bytes/signatures before processing.
 */
export function privateDocuments(current: Pick<Identity, "client">) {
  return current.client.storage.from(PRIVATE_DOCUMENT_BUCKET);
}
