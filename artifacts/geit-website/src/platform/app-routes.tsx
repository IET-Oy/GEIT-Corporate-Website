import { Link, Route, Switch } from "wouter";
import { SiteHeader } from "@/components/site-header";
import { platformModules } from "@/config/platform-modules";
import { CallbackPage, ForgotPasswordPage, RegisterPage, ResetPasswordPage, SignInPage } from "./auth-pages";
import { OverviewPage, PlannedPage, SettingsPage } from "./workspace";

export function AppRoutes() {
  const planned = platformModules.filter((m) => m.readiness === "planned");
  return (
    <div className="min-h-[100dvh] bg-[#f2f5f7]">
      <SiteHeader />
      <main id="app-main">
        <Switch>
          <Route path="/app" component={OverviewPage} />
          <Route path="/app/sign-in" component={SignInPage} />
          <Route path="/app/register" component={RegisterPage} />
          <Route path="/app/forgot-password" component={ForgotPasswordPage} />
          <Route path="/app/auth/callback" component={CallbackPage} />
          <Route path="/app/reset-password" component={ResetPasswordPage} />
          <Route path="/app/organisation-settings" component={SettingsPage} />
          {planned.map((m) => <Route key={m.id} path={m.path}><PlannedPage moduleId={m.id} /></Route>)}
          <Route><div className="mx-auto max-w-xl px-5 py-20"><h1 className="text-3xl font-extrabold text-[#10243a]">Page not found</h1><Link href="/app" className="mt-5 inline-block font-bold text-[#168568] underline">Back to the workspace</Link></div></Route>
        </Switch>
      </main>
      <footer className="border-t border-[#dce3e8] px-5 py-5 text-center text-xs text-[#6b7b87]">
        <Link href="/privacy-policy" className="underline">Privacy Policy</Link> · <Link href="/terms-of-use" className="underline">Terms of Use</Link> · Workspace available in English only
      </footer>
    </div>
  );
}
