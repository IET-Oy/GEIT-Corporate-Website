import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Link, useLocation, useSearch } from "wouter";
import { LogOut, Settings, LayoutGrid } from "lucide-react";
import {
  getGetPlatformMembersQueryKey, getGetPlatformSessionQueryKey, useAddPlatformMember, useCreatePlatformOrganisation,
  useGetPlatformMembers, useGetPlatformSession, usePlatformAuth, useRemovePlatformMember, useUpdatePlatformOrganisation,
  PlatformRole, type PlatformOrganisation,
} from "@workspace/api-client-react";
import { platformModules } from "@/config/platform-modules";
import { Alert, Field, PlannedBadge, ROLE_LABELS, Skeleton, SubmitButton, TextLink, WRITE, apiMessage, apiStatus, useOrgParam, usePageMeta, withOrg } from "./common";

type Ctx = { user: { id: string; email: string; fullName: string }; org: PlatformOrganisation };

function zones(): string[] {
  try { return (Intl as unknown as { supportedValuesOf: (k: string) => string[] }).supportedValuesOf("timeZone"); } catch { return ["Africa/Kigali", "UTC"]; }
}
const localZone = () => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || "Africa/Kigali"; } catch { return "Africa/Kigali"; } };

function OrgForm({ initial, submitLabel, pending, error, onSubmit, readOnly, testPrefix }: { initial: { name: string; timezone: string }; submitLabel: string; pending: boolean; error: unknown; onSubmit: (v: { name: string; timezone: string }) => void; readOnly?: boolean; testPrefix: string }) {
  const [name, setName] = useState(initial.name); const [tz, setTz] = useState(initial.timezone);
  const [errs, setErrs] = useState<{ name?: string; tz?: string }>({});
  useEffect(() => { setName(initial.name); setTz(initial.timezone); }, [initial.name, initial.timezone]);
  function submit(e: FormEvent) {
    e.preventDefault();
    if (readOnly) return;
    const n = name.trim(); const z = tz.trim();
    const next = { name: n.length >= 2 && n.length <= 120 ? undefined : "Name must be 2 to 120 characters.", tz: z.length >= 1 && z.length <= 80 ? undefined : "Enter a time zone, for example Africa/Kigali." };
    setErrs(next);
    if (next.name || next.tz) return;
    onSubmit({ name: n, timezone: z });
  }
  return (
    <form onSubmit={submit} noValidate className="space-y-5" aria-label={submitLabel}>
      {!!error && <Alert testId={`error-${testPrefix}`}>{apiMessage(error)}</Alert>}
      <Field label="ORGANISATION NAME" error={errs.name}>{(p) => <input id={p.id} className="form-input disabled:cursor-default disabled:bg-[#edf0f2] disabled:text-[#566b77]" value={name} readOnly={readOnly} disabled={readOnly} onChange={(e) => setName(e.target.value)} aria-invalid={p.invalid} aria-describedby={p.describedBy} data-testid={`input-${testPrefix}-name`} />}</Field>
      <Field label="TIME ZONE" hint="Used for scheduling and reporting periods." error={errs.tz}>{(p) => (<>
        <input id={p.id} list={`${p.id}-zones`} className="form-input disabled:cursor-default disabled:bg-[#edf0f2] disabled:text-[#566b77]" value={tz} readOnly={readOnly} disabled={readOnly} onChange={(e) => setTz(e.target.value)} aria-invalid={p.invalid} aria-describedby={p.describedBy} data-testid={`input-${testPrefix}-timezone`} />
        <datalist id={`${p.id}-zones`}>{zones().map((z) => <option key={z} value={z} />)}</datalist></>)}</Field>
      {!readOnly && <SubmitButton pending={pending} testId={`button-${testPrefix}-submit`}>{submitLabel}</SubmitButton>}
    </form>
  );
}

function OrgPicker({ orgs, path }: { orgs: PlatformOrganisation[]; path: string }) {
  const qc = useQueryClient(); const [, navigate] = useLocation();
  const create = useCreatePlatformOrganisation(WRITE);
  return (
    <div className="mx-auto grid max-w-[1000px] gap-10 px-5 py-12 lg:grid-cols-2 lg:px-8">
      <section className="page-reveal" aria-labelledby="pick-h">
        <h1 id="pick-h" className="text-3xl font-extrabold text-[#10243a]">{orgs.length ? "Choose an organisation" : "Set up your first organisation"}</h1>
        <p className="mt-4 text-sm leading-7 text-[#5d707c]">{orgs.length ? "The selection is kept in the page address, so you can bookmark or reload it." : "You are not a member of any organisation yet. Create one to start, or ask an owner to add you by your registered email."}</p>
        <ul className="mt-6 divide-y divide-[#dce3e8] border-y border-[#dce3e8]">
          {orgs.map((o) => (
            <li key={o.id}><Link href={withOrg(path, o.id)} className="flex items-center justify-between gap-4 px-1 py-4 hover:text-[#168568]" data-testid={`link-org-${o.id}`}>
              <span className="font-bold text-[#10243a]">{o.name}</span><span className="text-xs text-[#6b7b87]">{ROLE_LABELS[o.role]} · {o.timezone}</span></Link></li>
          ))}
        </ul>
      </section>
      <section className="page-reveal border border-[#dce3e8] bg-white p-6" aria-labelledby="create-h" style={{ animationDelay: ".08s" }}>
        <h2 id="create-h" className="mb-5 text-xl font-bold text-[#10243a]">Create an organisation</h2>
        <OrgForm testPrefix="create-org" initial={{ name: "", timezone: localZone() }} submitLabel="Create organisation" pending={create.isPending} error={create.error}
          onSubmit={(data) => create.mutate({ data }, { onSuccess: async (org) => { await qc.invalidateQueries({ queryKey: getGetPlatformSessionQueryKey() }); navigate(withOrg(path, org.id)); } })} />
      </section>
    </div>
  );
}

function SignOutButton() {
  const qc = useQueryClient(); const [, navigate] = useLocation();
  const auth = usePlatformAuth(WRITE);
  return (
    <span><button type="button" disabled={auth.isPending} data-testid="button-signout" className="inline-flex items-center gap-2 text-xs font-bold text-[#34495a] hover:text-[#168568]"
      onClick={() => auth.mutate({ action: "signout", data: {} }, { onSuccess: () => { qc.clear(); qc.setQueryData(getGetPlatformSessionQueryKey(), { user: null, organisations: [] }); navigate("/app/sign-in"); } })}>
      <LogOut size={14} aria-hidden="true" />{auth.isPending ? "Signing out" : "Sign out"}
    </button>{auth.isError && <span role="alert" className="block text-xs text-[#9b2c1b]">{apiMessage(auth.error, "Sign-out failed. Please try again.")}</span>}</span>
  );
}

/** Auth gate + org selection + workspace chrome. */
export function Workspace({ title, path, children }: { title: string; path: string; children: (c: Ctx) => ReactNode }) {
  usePageMeta(title);
  const session = useGetPlatformSession({ query: { retry: false, queryKey: getGetPlatformSessionQueryKey() } });
  const orgParam = useOrgParam();
  const choose = new URLSearchParams(useSearch()).get("choose") === "1";
  const [, navigate] = useLocation();
  const orgs = session.data?.organisations ?? [];
  const active = orgs.find((o) => o.id === orgParam) ?? null;
  const solo = orgs.length === 1 && !orgParam && !choose ? orgs[0] : null;
  useEffect(() => { if (solo && session.data?.user) navigate(withOrg(path, solo.id), { replace: true }); }, [solo, session.data?.user, path, navigate]);

  if (session.isLoading) return <Skeleton label="Loading your session" />;
  if (session.isError) {
    const expired = apiStatus(session.error) === 401;
    return (
      <div className="mx-auto max-w-xl space-y-5 px-5 py-16" data-testid="state-session-error">
        <Alert>{expired ? "Your session has expired. Sign in again to continue." : apiMessage(session.error, "We could not check your session.")}</Alert>
        <div className="flex gap-4">{expired ? <Link href="/app/sign-in" className="bg-[#168568] px-5 py-3 text-sm font-bold text-white">Sign in</Link> : <button type="button" onClick={() => session.refetch()} className="bg-[#168568] px-5 py-3 text-sm font-bold text-white" data-testid="button-retry">Try again</button>}</div>
      </div>
    );
  }
  const user = session.data?.user;
  if (!user) {
    return (
      <div className="mx-auto max-w-xl px-5 py-20 page-reveal" data-testid="state-signed-out">
        <h1 className="text-3xl font-extrabold text-[#10243a]">Sign in to open the workspace</h1>
        <p className="mt-4 text-sm leading-7 text-[#5d707c]">The Energy Intelligence workspace is for registered members of an organisation.</p>
        <div className="mt-7 flex flex-wrap gap-4"><Link href="/app/sign-in" data-testid="link-signin" className="bg-[#168568] px-6 py-3 text-sm font-bold text-white">Sign in</Link><Link href="/app/register" data-testid="link-register" className="border border-[#10243a] px-6 py-3 text-sm font-bold text-[#10243a]">Create account</Link></div>
      </div>
    );
  }
  if (!active) return solo ? <Skeleton label="Opening organisation" /> : <>
    {orgParam && orgs.length > 0 && <div className="mx-auto max-w-[1000px] px-5 pt-8"><Alert>That organisation was not found in your account. Choose one below.</Alert></div>}
    <OrgPicker orgs={orgs} path={path} />
  </>;

  return (
    <div className="mx-auto grid w-full min-w-0 max-w-[1320px] grid-cols-1 gap-0 lg:grid-cols-[270px_minmax(0,1fr)]">
      <aside className="min-w-0 border-b border-[#dce3e8] bg-white lg:min-h-[calc(100dvh-84px)] lg:border-b-0 lg:border-r">
        <div className="px-5 pt-5">
          <p className="text-[10px] font-bold tracking-[.16em] text-[#6b7b87]">ORGANISATION</p>
          <label htmlFor="org-switch" className="sr-only">Switch organisation</label>
          <select id="org-switch" className="form-input mt-2" value={active.id} data-testid="select-org" onChange={(e) => navigate(withOrg(path, e.target.value))}>
            {orgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
          <Link href="/app?choose=1" className="mt-3 inline-block text-xs font-bold text-[#168568] underline" data-testid="link-manage-organisations">Choose or create an organisation</Link>
          <div className="mt-3 flex items-center justify-between gap-2 text-xs text-[#6b7b87]"><span data-testid="text-user">{user.fullName}</span><SignOutButton /></div>
        </div>
        <nav aria-label="Workspace modules" className="mt-4 flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:overflow-visible lg:pb-6">
          {platformModules.map((m) => {
            const here = path === m.path;
            return (
              <Link key={m.id} href={withOrg(m.path, active.id)} aria-current={here ? "page" : undefined} data-testid={`link-module-${m.id}`}
                className={`flex shrink-0 items-center justify-between gap-3 border-l-2 px-3 py-2.5 text-[13px] font-semibold transition ${here ? "border-[#e8b64b] bg-[#e8f2ef] text-[#10243a]" : "border-transparent text-[#34495a] hover:bg-[#f2f5f7]"}`}>
                <span className="whitespace-nowrap">{m.title}</span>{m.readiness === "planned" && <PlannedBadge />}
              </Link>
            );
          })}
        </nav>
      </aside>
      <div className="min-w-0 px-5 py-8 lg:px-10 lg:py-10">{children({ user, org: active })}</div>
    </div>
  );
}

export function OverviewPage() {
  return (
    <Workspace title="Workspace overview" path="/app">{({ user, org }) => (
      <div className="page-reveal space-y-8">
        <header>
          <p className="text-[11px] font-bold tracking-[.19em] text-[#168568]">OVERVIEW</p>
          <h1 className="mt-3 text-3xl font-extrabold text-[#10243a]" data-testid="text-org-name">{org.name}</h1>
          <p className="mt-2 text-sm text-[#5d707c]">Signed in as {user.fullName}. Your role: <strong>{ROLE_LABELS[org.role]}</strong>. Time zone: {org.timezone}.</p>
        </header>
        <Alert tone="info">Account and organisation management are live. Energy Management, four engineering modules (consulting, auditing, renewable energy, battery), Carbon Footprint and AI & Digital Energy are available. Projects and Reports is planned and does not hold data yet; no figures are shown until they are built.</Alert>
        <div className="grid gap-px bg-[#d0dce1] sm:grid-cols-2">
          <Link href={withOrg("/app/organisation-settings", org.id)} data-testid="link-overview-settings" className="flex items-start gap-4 bg-white p-6 hover:bg-[#f2f5f7]"><Settings className="mt-1 text-[#168568]" size={20} aria-hidden="true" /><span><strong className="block text-[#10243a]">Organisation settings</strong><span className="text-sm text-[#5d707c]">Edit details and manage members.</span></span></Link>
          <div className="flex items-start gap-4 bg-white p-6"><LayoutGrid className="mt-1 text-[#6b7b87]" size={20} aria-hidden="true" /><span><strong className="block text-[#10243a]">Service modules</strong><span className="text-sm text-[#5d707c]">Energy Management, six engineering and sustainability modules are available. Projects and Reports is planned; use the side navigation to read its notice.</span></span></div>
        </div>
      </div>)}
    </Workspace>
  );
}

export function PlannedPage({ moduleId }: { moduleId: string }) {
  const mod = platformModules.find((m) => m.id === moduleId)!;
  return (
    <Workspace title={`${mod.title} (planned)`} path={mod.path}>{({ org }) => (
      <div className="page-reveal max-w-2xl" data-testid={`planned-${mod.id}`}>
        <PlannedBadge />
        <h1 className="mt-5 text-3xl font-extrabold text-[#10243a]">{mod.title}</h1>
        <p className="mt-5 text-sm leading-7 text-[#5d707c]">This module is planned and not yet available. Nothing here can be saved or calculated, and no results are shown. When it is released, it will appear in this workspace for {org.name} under your existing role.</p>
        <div className="mt-7 flex flex-wrap gap-5"><TextLink href={withOrg("/app", org.id)}>Back to overview</TextLink><TextLink href="/contact">Discuss this service with GEIT</TextLink></div>
      </div>)}
    </Workspace>
  );
}

const roleOptions = Object.values(PlatformRole);

function Members({ org }: { org: PlatformOrganisation }) {
  const qc = useQueryClient();
  const members = useGetPlatformMembers(org.id, { query: { retry: false, queryKey: getGetPlatformMembersQueryKey(org.id) } });
  const add = useAddPlatformMember(WRITE); const remove = useRemovePlatformMember(WRITE);
  const [email, setEmail] = useState(""); const [role, setRole] = useState<PlatformRole>("reader");
  const [err, setErr] = useState<string | null>(null); const [ok, setOk] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const isOwner = org.role === "owner";
  const refresh = () => Promise.all([qc.invalidateQueries({ queryKey: getGetPlatformMembersQueryKey(org.id) }), qc.invalidateQueries({ queryKey: getGetPlatformSessionQueryKey() })]);
  function submit(e: FormEvent) {
    e.preventDefault(); setOk(null);
    const v = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || v.length > 254) { setErr("Enter a valid email address."); return; }
    setErr(null);
    add.mutate({ id: org.id, data: { email: v, role } }, { onSuccess: async (r) => { setOk(r.message); setEmail(""); await refresh(); } });
  }
  return (
    <section aria-labelledby="members-h" className="space-y-6">
      <h2 id="members-h" className="text-xl font-bold text-[#10243a]">Members</h2>
      {members.isLoading && <Skeleton label="Loading members" />}
      {members.isError && <Alert testId="error-members">{apiStatus(members.error) === 401 ? "Your session has expired. Sign in again." : apiMessage(members.error)} <button type="button" className="font-bold underline" onClick={() => members.refetch()} data-testid="button-retry-members">Retry</button></Alert>}
      {members.data && members.data.length === 0 && <p className="border border-dashed border-[#c5d1d8] p-6 text-sm text-[#5d707c]">No members are listed.</p>}
      {members.data && members.data.length > 0 && (
        <ul className="divide-y divide-[#dce3e8] border-y border-[#dce3e8]" data-testid="list-members">
          {members.data.map((m) => (
            <li key={m.userId} className="flex flex-wrap items-center justify-between gap-3 py-3" data-testid={`row-member-${m.userId}`}>
              <span className="font-semibold text-[#10243a]">{m.fullName}</span>
              <span className="flex items-center gap-4"><span className="text-sm text-[#5d707c]">{ROLE_LABELS[m.role]}</span>
                {isOwner && (confirming === m.userId ? (
                  <span className="flex items-center gap-3 text-xs">
                    <button type="button" className="font-bold text-[#9b2c1b] underline" disabled={remove.isPending} data-testid={`button-confirm-remove-${m.userId}`} onClick={() => remove.mutate({ id: org.id, userId: m.userId }, { onSuccess: async () => { setConfirming(null); await refresh(); }, onError: () => setConfirming(null) })}>Confirm removal</button>
                    <button type="button" className="underline" onClick={() => setConfirming(null)}>Cancel</button></span>
                ) : <button type="button" className="text-xs font-bold text-[#9b2c1b] underline" data-testid={`button-remove-${m.userId}`} onClick={() => setConfirming(m.userId)}>Remove</button>)}
              </span>
            </li>))}
        </ul>
      )}
      {remove.isError && <Alert testId="error-remove">{apiMessage(remove.error)}</Alert>}
      {isOwner ? (
        <form onSubmit={submit} noValidate aria-label="Add member or change role" className="space-y-4 border border-[#dce3e8] bg-white p-5">
          <h3 className="font-bold text-[#10243a]">Add a member or change a role</h3>
          <p className="text-xs leading-5 text-[#6b7b87]">Only people who already hold a verified GEIT account can be added. No invitation email is sent. Emails are never listed here.</p>
          {add.isError && <Alert testId="error-add-member">{apiMessage(add.error)}</Alert>}
          {ok && <Alert tone="success" testId="status-member">{ok}</Alert>}
          <div className="grid gap-4 sm:grid-cols-[1fr_200px]">
            <Field label="MEMBER EMAIL" error={err}>{(p) => <input id={p.id} type="email" className="form-input" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={p.invalid} aria-describedby={p.describedBy} data-testid="input-member-email" />}</Field>
            <Field label="ROLE">{(p) => <select id={p.id} className="form-input" value={role} onChange={(e) => setRole(e.target.value as PlatformRole)} data-testid="select-member-role">{roleOptions.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}</select>}</Field>
          </div>
          <SubmitButton pending={add.isPending} testId="button-add-member">Save member</SubmitButton>
        </form>
      ) : <Alert tone="info">Only owners can add members, change roles or remove members.</Alert>}
    </section>
  );
}

export function SettingsPage() {
  return (
    <Workspace title="Organisation settings" path="/app/organisation-settings">{({ org }) => <SettingsBody key={org.id} org={org} />}</Workspace>
  );
}
function SettingsBody({ org }: { org: PlatformOrganisation }) {
  const qc = useQueryClient();
  const update = useUpdatePlatformOrganisation(WRITE);
  const [saved, setSaved] = useState(false);
  const canEdit = org.role === "owner" || org.role === "admin";
  return (
    <div className="page-reveal max-w-3xl space-y-10">
      <header><p className="text-[11px] font-bold tracking-[.19em] text-[#168568]">ORGANISATION SETTINGS</p><h1 className="mt-3 text-3xl font-extrabold text-[#10243a]">{org.name}</h1><p className="mt-2 text-sm text-[#5d707c]">Your role: {ROLE_LABELS[org.role]}</p></header>
      <section aria-labelledby="details-h" className="border border-[#dce3e8] bg-white p-6">
        <h2 id="details-h" className="mb-5 text-xl font-bold text-[#10243a]">Details</h2>
        {saved && <div className="mb-5"><Alert tone="success" testId="status-org-saved">Organisation updated.</Alert></div>}
        {!canEdit && <div className="mb-5"><Alert tone="info">Only owners and administrators can edit organisation details.</Alert></div>}
        <OrgForm testPrefix="edit-org" readOnly={!canEdit} initial={{ name: org.name, timezone: org.timezone }} submitLabel="Save changes" pending={update.isPending} error={update.error}
          onSubmit={(data) => { setSaved(false); update.mutate({ id: org.id, data }, { onSuccess: async () => { setSaved(true); await qc.invalidateQueries({ queryKey: getGetPlatformSessionQueryKey() }); } }); }} />
      </section>
      <Members org={org} />
    </div>
  );
}
