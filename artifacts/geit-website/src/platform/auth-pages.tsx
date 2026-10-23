import { useEffect, useRef, useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { usePlatformAuth } from "@workspace/api-client-react";
import { Alert, AuthFrame, Field, SubmitButton, TextLink, WRITE, apiMessage } from "./common";

const MIN = 12, MAX = 128;
function pwError(v: string) {
  if (v.length < MIN) return `Use at least ${MIN} characters.`;
  if (v.length > MAX) return `Use at most ${MAX} characters.`;
  return null;
}
const emailOk = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) && v.length <= 254;
function focusInvalid(event: FormEvent, field: string) {
  event.currentTarget.querySelector<HTMLInputElement>(`[data-testid="input-${field}"]`)?.focus();
}

export function SignInPage() {
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const auth = usePlatformAuth(WRITE);
  const [email, setEmail] = useState(""); const [password, setPassword] = useState("");
  const [errs, setErrs] = useState<{ email?: string; password?: string }>({});
  function submit(e: FormEvent) {
    e.preventDefault();
    const next = { email: emailOk(email.trim()) ? undefined : "Enter a valid email address.", password: password ? undefined : "Enter your password." };
    setErrs(next);
    if (next.email || next.password) { focusInvalid(e, next.email ? "email" : "password"); return; }
    auth.mutate({ action: "signin", data: { email: email.trim(), password } }, {
      onSuccess: () => {
        // A successful sign-in may switch accounts after expiry or recovery.
        // Do not retain the previous principal's cached tenant data or requests.
        qc.clear();
        navigate("/app");
      },
    });
  }
  return (
    <AuthFrame title="Sign in to your workspace" intro="Use the account you registered with. Your session is held in a secure cookie, never in browser storage."
      footer={<div className="flex flex-wrap justify-between gap-3"><span>No account? <TextLink href="/app/register" testId="link-register">Create one</TextLink></span><TextLink href="/app/forgot-password" testId="link-forgot">Forgot password</TextLink></div>}>
      <form onSubmit={submit} noValidate className="space-y-5" aria-label="Sign in">
        {auth.isError && <Alert testId="error-signin">{apiMessage(auth.error, "Sign in was not successful.")}</Alert>}
        <Field label="EMAIL" error={errs.email}>{(p) => <input id={p.id} required maxLength={254} type="email" autoComplete="email" className="form-input" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={p.invalid} aria-describedby={p.describedBy} data-testid="input-email" />}</Field>
        <Field label="PASSWORD" error={errs.password}>{(p) => <input id={p.id} required maxLength={MAX} type="password" autoComplete="current-password" className="form-input" value={password} onChange={(e) => setPassword(e.target.value)} aria-invalid={p.invalid} aria-describedby={p.describedBy} data-testid="input-password" />}</Field>
        <SubmitButton pending={auth.isPending} testId="button-signin">Sign in</SubmitButton>
      </form>
    </AuthFrame>
  );
}

export function RegisterPage() {
  const auth = usePlatformAuth(WRITE);
  const [fullName, setName] = useState(""); const [email, setEmail] = useState(""); const [password, setPassword] = useState("");
  const [errs, setErrs] = useState<{ fullName?: string; email?: string; password?: string }>({});
  const [done, setDone] = useState<string | null>(null);
  function submit(e: FormEvent) {
    e.preventDefault();
    const n = fullName.trim();
    const next = { fullName: n.length >= 2 && n.length <= 120 ? undefined : "Enter your full name (2 to 120 characters).", email: emailOk(email.trim()) ? undefined : "Enter a valid email address.", password: pwError(password) ?? undefined };
    setErrs(next);
    if (next.fullName || next.email || next.password) { focusInvalid(e, next.fullName ? "fullname" : next.email ? "email" : "password"); return; }
    auth.mutate({ action: "signup", data: { fullName: n, email: email.trim(), password } }, { onSuccess: (r) => { setDone(r.message); setPassword(""); } });
  }
  return (
    <AuthFrame title="Create a workspace account" intro="Register to create or join an organisation workspace for energy analysis, engineering scenarios, carbon calculations and saved reports."
      footer={<span>Already registered? <TextLink href="/app/sign-in" testId="link-signin">Sign in</TextLink></span>}>
      {done ? (
        <div className="space-y-4" data-testid="status-registered">
          <Alert tone="success">{done}</Alert>
          <p className="text-sm leading-6 text-[#5d707c]">Check your email for the next step. If nothing arrives, the address may already be registered; you can sign in or reset your password.</p>
        </div>
      ) : (
        <form onSubmit={submit} noValidate className="space-y-5" aria-label="Register">
          {auth.isError && <Alert testId="error-register">{apiMessage(auth.error, "Registration was not successful.")}</Alert>}
          <Field label="FULL NAME" error={errs.fullName}>{(p) => <input id={p.id} required minLength={2} maxLength={120} autoComplete="name" className="form-input" value={fullName} onChange={(e) => setName(e.target.value)} aria-invalid={p.invalid} aria-describedby={p.describedBy} data-testid="input-fullname" />}</Field>
          <Field label="EMAIL" error={errs.email}>{(p) => <input id={p.id} required maxLength={254} type="email" autoComplete="email" className="form-input" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={p.invalid} aria-describedby={p.describedBy} data-testid="input-email" />}</Field>
          <Field label="PASSWORD" hint={`${MIN} to ${MAX} characters.`} error={errs.password}>{(p) => <input id={p.id} required minLength={MIN} maxLength={MAX} type="password" autoComplete="new-password" className="form-input" value={password} onChange={(e) => setPassword(e.target.value)} aria-invalid={p.invalid} aria-describedby={p.describedBy} data-testid="input-password" />}</Field>
          <p className="text-xs leading-5 text-[#6b7b87]">Your name, email and credentials are stored in a Supabase authentication account operated for GEIT. Read the <TextLink href="/privacy-policy" testId="link-privacy">Privacy Policy</TextLink> and <TextLink href="/terms-of-use" testId="link-terms">Terms of Use</TextLink>. Registering means you accept them.</p>
          <SubmitButton pending={auth.isPending} testId="button-register">Create account</SubmitButton>
        </form>
      )}
    </AuthFrame>
  );
}

export function ForgotPasswordPage() {
  const auth = usePlatformAuth(WRITE);
  const [email, setEmail] = useState(""); const [err, setErr] = useState<string | null>(null); const [done, setDone] = useState<string | null>(null);
  function submit(e: FormEvent) {
    e.preventDefault();
    if (!emailOk(email.trim())) { setErr("Enter a valid email address."); focusInvalid(e, "email"); return; }
    setErr(null);
    auth.mutate({ action: "recovery", data: { email: email.trim() } }, { onSuccess: (r) => setDone(r.message) });
  }
  return (
    <AuthFrame title="Reset your password" intro="Enter your account email. If it can be recovered, a link will be sent."
      footer={<TextLink href="/app/sign-in" testId="link-signin">Back to sign in</TextLink>}>
      {done ? <Alert tone="success"><span data-testid="status-recovery">{done} Check your email.</span></Alert> : (
        <form onSubmit={submit} noValidate className="space-y-5" aria-label="Request password reset">
          {auth.isError && <Alert testId="error-recovery">{apiMessage(auth.error)}</Alert>}
          <Field label="EMAIL" error={err}>{(p) => <input id={p.id} required maxLength={254} type="email" autoComplete="email" className="form-input" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={p.invalid} aria-describedby={p.describedBy} data-testid="input-email" />}</Field>
          <SubmitButton pending={auth.isPending} testId="button-recovery">Send reset link</SubmitButton>
        </form>
      )}
    </AuthFrame>
  );
}

export function CallbackPage() {
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const auth = usePlatformAuth(WRITE);
  const fired = useRef(false);
  const [missing, setMissing] = useState(false);
  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const recovery = params.get("flow") === "recovery";
    if (!code) { setMissing(true); return; }
    auth.mutate({ action: "callback", data: { code } }, {
      onSuccess: () => {
        window.history.replaceState(null, "", window.location.pathname);
        qc.clear();
        navigate(recovery ? "/app/reset-password" : "/app", { replace: true });
      },
      onError: () => window.history.replaceState(null, "", window.location.pathname),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const failed = missing || auth.isError;
  return (
    <AuthFrame title={failed ? "This link did not work" : "Confirming your sign in"} intro={failed ? "The link may have expired or already been used." : "One moment while we complete your sign in."}
      footer={failed ? <TextLink href="/app/sign-in" testId="link-signin">Go to sign in</TextLink> : undefined}>
      {failed ? <Alert testId="error-callback">{missing ? "No sign-in code was found in this link." : apiMessage(auth.error, "The sign-in link could not be verified.")}</Alert>
        : <div role="status" aria-live="polite" className="h-2 w-full overflow-hidden bg-[#dfe7ea]"><div className="h-full w-1/3 animate-pulse bg-[#168568]" /><span className="sr-only">Confirming</span></div>}
    </AuthFrame>
  );
}

export function ResetPasswordPage() {
  const [, navigate] = useLocation();
  const auth = usePlatformAuth(WRITE);
  const [password, setPassword] = useState(""); const [confirm, setConfirm] = useState("");
  const [errs, setErrs] = useState<{ password?: string; confirm?: string }>({});
  const [done, setDone] = useState<string | null>(null);
  function submit(e: FormEvent) {
    e.preventDefault();
    const next = { password: pwError(password) ?? undefined, confirm: confirm === password ? undefined : "Passwords do not match." };
    setErrs(next);
    if (next.password || next.confirm) { focusInvalid(e, next.password ? "password" : "confirm"); return; }
    auth.mutate({ action: "password", data: { password } }, { onSuccess: (r) => { setDone(r.message); setPassword(""); setConfirm(""); setTimeout(() => navigate("/app"), 1200); } });
  }
  const expired = auth.isError && (auth.error as { status?: number }).status === 401;
  return (
    <AuthFrame title="Choose a new password" intro={`Use ${MIN} to ${MAX} characters. You must arrive here from a recovery link.`}
      footer={<TextLink href="/app/sign-in" testId="link-signin">Back to sign in</TextLink>}>
      {done ? <Alert tone="success"><span data-testid="status-password">{done}</span></Alert> : (
        <form onSubmit={submit} noValidate className="space-y-5" aria-label="Set new password">
          {auth.isError && <Alert testId="error-password">{expired ? "Your recovery session has expired. Request a new reset link. " : ""}{apiMessage(auth.error)}</Alert>}
          <Field label="NEW PASSWORD" error={errs.password}>{(p) => <input id={p.id} required minLength={MIN} maxLength={MAX} type="password" autoComplete="new-password" className="form-input" value={password} onChange={(e) => setPassword(e.target.value)} aria-invalid={p.invalid} aria-describedby={p.describedBy} data-testid="input-password" />}</Field>
          <Field label="CONFIRM PASSWORD" error={errs.confirm}>{(p) => <input id={p.id} required minLength={MIN} maxLength={MAX} type="password" autoComplete="new-password" className="form-input" value={confirm} onChange={(e) => setConfirm(e.target.value)} aria-invalid={p.invalid} aria-describedby={p.describedBy} data-testid="input-confirm" />}</Field>
          <SubmitButton pending={auth.isPending} testId="button-password">Update password</SubmitButton>
        </form>
      )}
    </AuthFrame>
  );
}
