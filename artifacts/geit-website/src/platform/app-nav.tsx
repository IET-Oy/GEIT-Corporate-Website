import { Link } from "wouter";
export function AppNav() {
  return (
    <div className="border-b border-[#dce3e8] bg-[#10243a] text-white" data-testid="nav-application">
      <nav aria-label="Application" className="mx-auto flex max-w-[1320px] items-center justify-end gap-6 px-4 py-2 text-xs font-semibold sm:px-8">
        <Link href="/app" data-testid="link-workspace" className="hover:text-[#e8b64b]">Energy Intelligence workspace</Link>
        <Link href="/app/sign-in" data-testid="link-account-signin" className="border border-white/40 px-3 py-1 hover:bg-white/10">Account sign in</Link>
      </nav>
    </div>
  );
}
