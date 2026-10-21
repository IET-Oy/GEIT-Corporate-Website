import { Link, Route, Switch } from "wouter";
import { SiteHeader } from "@/components/site-header";
import { AppNav } from "./app-nav";
import { platformModules } from "@/config/platform-modules";
import { CallbackPage, ForgotPasswordPage, RegisterPage, ResetPasswordPage, SignInPage } from "./auth-pages";
import { OverviewPage, PlannedPage, SettingsPage } from "./workspace";
import { EnergyPage } from "./energy/energy-page";
import { lazy, Suspense } from "react";
import { MODULE_PATH, type EngModule } from "./engineering/model-forms";

const EngineeringPage = lazy(() => import("./engineering/engineering-page").then((m) => ({ default: m.EngineeringPage })));
const SustainabilityPage = lazy(() => import("./sustainability/sustainability-page").then((m) => ({ default: m.SustainabilityPage })));
const engineering = Object.keys(MODULE_PATH) as EngModule[];

export function AppRoutes() {
  const planned = platformModules.filter((m) => m.readiness === "planned");
  return (
    <div className="geit-app min-h-[100dvh] bg-[#f2f5f7]">
      <SiteHeader />
      <AppNav />
      <main id="app-main">
        <Switch>
          <Route path="/app" component={OverviewPage} />
          <Route path="/app/sign-in" component={SignInPage} />
          <Route path="/app/register" component={RegisterPage} />
          <Route path="/app/forgot-password" component={ForgotPasswordPage} />
          <Route path="/app/auth/callback" component={CallbackPage} />
          <Route path="/app/reset-password" component={ResetPasswordPage} />
          <Route path="/app/organisation-settings" component={SettingsPage} />
          <Route path="/app/energy-management" component={EnergyPage} />
          {engineering.map((id) => <Route key={id} path={MODULE_PATH[id]}><Suspense fallback={<div className="p-8 text-sm" role="status">Loading module</div>}><EngineeringPage moduleId={id} /></Suspense></Route>)}
          <Route path="/app/carbon-footprint"><Suspense fallback={<div className="p-8 text-sm" role="status">Loading module</div>}><SustainabilityPage moduleId="carbon-footprint" /></Suspense></Route>
          <Route path="/app/digital-energy"><Suspense fallback={<div className="p-8 text-sm" role="status">Loading module</div>}><SustainabilityPage moduleId="digital-energy" /></Suspense></Route>
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
