import { useEffect, useRef, useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { getExportEngineeringScenarioUrl, type EngineeringModule } from "@workspace/api-client-react";
import { Alert } from "../common";

type Format = "csv" | "xlsx" | "pdf" | "json";
const MIME: Record<Format, string> = {
  csv: "text/csv", xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  pdf: "application/pdf", json: "application/json",
};
export function ReportDownloads({ org, module, id }: { org: string; module: EngineeringModule; id: string }) {
  const [pending, setPending] = useState<Format | null>(null);
  const [error, setError] = useState("");
  const [ready, setReady] = useState<{ url: string; filename: string; format: Format } | null>(null);
  const url = useRef<string | null>(null), controller = useRef<AbortController | null>(null), mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; controller.current?.abort(); if (url.current) URL.revokeObjectURL(url.current); };
  }, []);
  async function download(format: Format) {
    if (controller.current) return;
    const abort = new AbortController(); controller.current = abort;
    const timer = window.setTimeout(() => abort.abort(), 60000);
    setPending(format); setError("");
    try {
      const response = await fetch(getExportEngineeringScenarioUrl(org, module, id, format), { credentials: "include", signal: abort.signal, cache: "no-store" });
      if (!response.ok) throw new Error(response.status === 401 ? "Your session expired. Sign in again before downloading."
        : response.status === 403 ? "Your account cannot download this report."
          : `The report could not be downloaded (HTTP ${response.status}). Try again.`);
      if (!response.headers.get("Content-Type")?.startsWith(MIME[format])) throw new Error("The server did not return the requested report format. Try again.");
      const blob = await response.blob();
      if (!blob.size) throw new Error("The report was empty. Try again.");
      if (!mounted.current) return;
      if (url.current) URL.revokeObjectURL(url.current);
      const blobUrl = URL.createObjectURL(blob), filename = `GEIT-${module}-${id}.${format}`;
      url.current = blobUrl; setReady({ url: blobUrl, filename, format });
      const anchor = document.createElement("a");
      anchor.href = blobUrl; anchor.download = filename; document.body.appendChild(anchor); anchor.click(); anchor.remove();
    } catch (e) {
      if (mounted.current) setError(abort.signal.aborted ? "Report preparation timed out. Please try again."
        : e instanceof Error ? e.message : "The report could not be downloaded. Try again.");
    } finally {
      window.clearTimeout(timer); controller.current = null;
      if (mounted.current) setPending(null);
    }
  }
  return (
    <div className="mt-5 min-w-0 space-y-3">
      <div className="flex flex-wrap gap-3" aria-label="Export saved scenario">
        {(["csv", "xlsx", "pdf", "json"] as const).map((format) => (
          <button type="button" key={format} disabled={pending !== null} onClick={() => void download(format)}
            data-testid={`link-export-${format}`} className="inline-flex min-h-[38px] items-center gap-2 border border-[#10243a] px-4 text-xs font-bold text-[#10243a] hover:bg-[#10243a] hover:text-white disabled:cursor-wait disabled:opacity-60">
            {pending === format ? <Loader2 size={13} className="animate-spin" aria-hidden="true" /> : <Download size={13} aria-hidden="true" />}{format.toUpperCase()}
          </button>
        ))}
      </div>
      <p aria-live="polite" role="status" className="text-sm text-[#34495a]" data-testid="status-report-download">
        {pending ? `Preparing your ${pending.toUpperCase()} report…` : ready ? "Report prepared. If the download did not start, use the link below." : ""}
      </p>
      {ready && !pending && <a href={ready.url} download={ready.filename} data-testid="link-prepared-report"
        className="inline-flex min-h-[38px] items-center gap-2 text-sm font-bold text-[#168568] underline"><Download size={14} aria-hidden="true" />Download {ready.format.toUpperCase()} again</a>}
      {error && <Alert testId="error-report-download">{error}</Alert>}
    </div>
  );
}
