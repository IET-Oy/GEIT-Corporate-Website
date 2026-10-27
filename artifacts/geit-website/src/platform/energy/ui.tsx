import type { ReactNode } from "react";
import { FlaskConical } from "lucide-react";

export type Perm = { manage: boolean; work: boolean };
export function permsFor(role: string): Perm {
  const manage = ["owner", "admin", "editor"].includes(role);
  return { manage, work: manage || role === "analyst" };
}
export const UNITS = ["Wh", "kWh", "MWh", "MJ", "GJ", "W", "kW", "MW"] as const;

export function fmt(v: number | null | undefined, digits = 1, suffix = ""): string {
  if (v === null || v === undefined || Number.isNaN(v)) return "Unavailable";
  return `${v.toLocaleString("en-GB", { maximumFractionDigits: digits, minimumFractionDigits: 0 })}${suffix}`;
}
export function fmtDate(s: string) {
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? s : d.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
}

export function DemoBadge() {
  return <span className="inline-flex items-center gap-1 border border-[#b8c9d3] bg-[#eaf1f5] px-2 py-0.5 text-[10px] font-bold tracking-[.12em] text-[#2b4a60]"><FlaskConical size={11} aria-hidden="true" />SYNTHETIC DEMO</span>;
}
export function StateBadge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "warn" | "good" }) {
  const c = tone === "warn" ? "border-[#e8b64b] bg-[#fdf4dc] text-[#7a5a10]" : tone === "good" ? "border-[#b5d8cc] bg-[#e8f2ef] text-[#1c5946]" : "border-[#dce3e8] bg-[#f2f5f7] text-[#566b77]";
  return <span className={`inline-block border px-2 py-0.5 text-[10px] font-bold tracking-[.1em] ${c}`}>{children}</span>;
}
export function Panel({ title, id, action, children }: { title: string; id: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="min-w-0 border border-[#dce3e8] bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#edf0f2] px-5 py-4">
        <h2 id={id} className="text-lg font-bold text-[#10243a]">{title}</h2>{action}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}
export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="border border-dashed border-[#c5d1d8] bg-[#f8fafb] p-6" data-testid="state-empty">
      <p className="font-bold text-[#10243a]">{title}</p>
      {children && <div className="mt-2 text-sm leading-6 text-[#5d707c]">{children}</div>}
    </div>
  );
}
export function Btn({ children, onClick, testId, tone = "quiet", disabled, type = "button" }: { children: ReactNode; onClick?: () => void; testId: string; tone?: "primary" | "quiet" | "danger"; disabled?: boolean; type?: "button" | "submit" }) {
  const c = tone === "primary" ? "bg-[#168568] text-white hover:bg-[#116d55]" : tone === "danger" ? "border border-[#9b2c1b] text-[#9b2c1b] hover:bg-[#fbeeeb]" : "border border-[#10243a] text-[#10243a] hover:bg-[#10243a] hover:text-white";
  return <button type={type} onClick={onClick} disabled={disabled} data-testid={testId} className={`inline-flex min-h-[38px] items-center justify-center gap-2 px-4 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${c}`}>{children}</button>;
}
export function Stat({ label, value, note, testId }: { label: string; value: string; note?: string; testId: string }) {
  return (
    <div className="bg-white p-4" data-testid={testId}>
      <dt className="text-[10px] font-bold tracking-[.14em] text-[#6b7b87]">{label}</dt>
      <dd className="mt-2 font-[Manrope] text-2xl font-extrabold text-[#10243a]">{value}</dd>
      {note && <p className="mt-1 text-xs text-[#6b7b87]">{note}</p>}
    </div>
  );
}
