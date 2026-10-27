import { useEffect, useId, type ReactNode } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { AlertTriangle, CircleDashed, Loader2 } from "lucide-react";
import "./energy-dt-glass.css";

export const WRITE = { request: { headers: { "X-GEIT-Request": "1" } } } as const;

export const ROLE_LABELS: Record<string, string> = {
  owner: "Owner", admin: "Administrator", editor: "Editor",
  analyst: "Analyst", reader: "Reader",
};

export function apiMessage(error: unknown, fallback = "Something went wrong. Please try again."): string {
  const data = (error as { data?: { error?: unknown } } | null)?.data;
  if (data && typeof data.error === "string" && data.error) return data.error;
  return fallback;
}
export function apiStatus(error: unknown): number | undefined {
  const s = (error as { status?: unknown } | null)?.status;
  return typeof s === "number" ? s : undefined;
}

export function useOrgParam(): string | null {
  const search = useSearch();
  return new URLSearchParams(search).get("org");
}
export function withOrg(path: string, org?: string | null) {
  return org ? `${path}?org=${encodeURIComponent(org)}` : path;
}

export function usePageMeta(title: string) {
  useEffect(() => {
    document.title = `${title} | GEIT Energy DT — Energy Digital Twin`;
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex, nofollow";
    document.head.appendChild(meta);
    return () => { meta.remove(); };
  }, [title]);
}

export function Alert({ tone = "error", children, testId }: { tone?: "error" | "info" | "success"; children: ReactNode; testId?: string }) {
  const palette = tone === "error" ? "border-[#e2b4aa] bg-[#fbeeeb] text-[#7a2a1d]" : tone === "success" ? "border-[#b5d8cc] bg-[#e8f2ef] text-[#1c5946]" : "border-[#dce3e8] bg-white text-[#34495a]";
  return (
    <div role={tone === "error" ? "alert" : "status"} data-testid={testId} className={`flex gap-3 border-l-4 px-4 py-3 text-sm leading-6 ${palette}`}>
      {tone === "error" && <AlertTriangle size={18} className="mt-1 shrink-0" aria-hidden="true" />}
      <div>{children}</div>
    </div>
  );
}

export function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string | null; children: (p: { id: string; describedBy?: string; invalid: boolean }) => ReactNode }) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errId = error ? `${id}-err` : undefined;
  return (
    <div className="min-w-0 max-w-full [overflow-wrap:anywhere]">
      <label htmlFor={id} className="mb-2 block text-xs font-bold tracking-[.08em] text-[#34495a]">{label}</label>
      {children({ id, describedBy: [hintId, errId].filter(Boolean).join(" ") || undefined, invalid: !!error })}
      {hint && <p id={hintId} className="mt-1.5 text-xs leading-5 text-[#6b7b87]">{hint}</p>}
      {error && <p id={errId} className="mt-1.5 text-xs font-semibold text-[#9b2c1b]">{error}</p>}
    </div>
  );
}

export function SubmitButton({ pending, children, testId, tone = "primary", disabled }: { pending?: boolean; children: ReactNode; testId: string; tone?: "primary" | "quiet"; disabled?: boolean }) {
  return (
    <button type="submit" disabled={pending || disabled} data-testid={testId} className={`inline-flex min-h-[46px] items-center justify-center gap-2 px-6 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-60 ${tone === "primary" ? "bg-[#168568] text-white hover:bg-[#116d55]" : "border border-[#10243a] text-[#10243a] hover:bg-[#10243a] hover:text-white"}`}>
      {pending && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
      {children}
    </button>
  );
}

export function AuthFrame({ title, intro, children, footer }: { title: string; intro: string; children: ReactNode; footer?: ReactNode }) {
  usePageMeta(title);
  return (
    <div className="energy-dt-glass-page mx-auto grid max-w-[1120px] gap-10 px-5 py-12 lg:grid-cols-[.9fr_1.1fr] lg:px-10 lg:py-20">
      <div className="page-reveal">
        <p className="mb-5 flex items-center gap-3 text-[11px] font-bold tracking-[.19em] text-[#168568]"><span className="h-[2px] w-7 bg-[#e8b64b]" />ENERGY DT — ENERGY DIGITAL TWIN</p>
        <h1 className="text-3xl font-extrabold leading-tight text-[#10243a] sm:text-4xl">{title}</h1>
        <p className="mt-5 max-w-md text-sm leading-7 text-[#5d707c]">{intro}</p>
        <p className="mt-8 max-w-md border-l-2 border-[#e8b64b] pl-4 text-xs leading-5 text-[#6b7b87]">The workspace is currently available in English only. Corporate pages remain available in every supported language.</p>
      </div>
      <div className="energy-dt-glass-content page-reveal border border-[#dce3e8] bg-white p-6 sm:p-9" style={{ animationDelay: ".08s" }}>
        {children}
        {footer && <div className="mt-7 border-t border-[#edf0f2] pt-5 text-sm text-[#5d707c]">{footer}</div>}
      </div>
    </div>
  );
}

export function TextLink({ href, children, testId }: { href: string; children: ReactNode; testId?: string }) {
  return <Link href={href} data-testid={testId} className="font-bold text-[#168568] underline underline-offset-4 hover:text-[#116d55]">{children}</Link>;
}

export function Skeleton({ label = "Loading" }: { label?: string }) {
  return (
    <div role="status" aria-live="polite" className="space-y-4 p-6" data-testid="status-loading">
      <span className="sr-only">{label}</span>
      {[60, 90, 75].map((w) => <div key={w} className="h-5 animate-pulse bg-[#dfe7ea]" style={{ width: `${w}%` }} />)}
    </div>
  );
}

export function PlannedBadge() {
  return <span className="inline-flex items-center gap-1 border border-[#e8b64b] bg-[#fdf4dc] px-2 py-0.5 text-[10px] font-bold tracking-[.12em] text-[#7a5a10]"><CircleDashed size={11} aria-hidden="true" />PLANNED</span>;
}

export function useAppLocation() { return useLocation(); }
