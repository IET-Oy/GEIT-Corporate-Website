import { JSDOM } from "jsdom";
import path from "node:path";
import { createServer } from "vite";

/** Real components, generated client and query cache; local response adapter only.
 * Never forwards requests to an application server, Supabase or another network.
 */
export async function platformRuntime(root) {
  const dom = new JSDOM("<!doctype html><html><head></head><body></body></html>", { url: "https://synthetic.invalid/app/sign-in" });
  const globals = {
    window: dom.window, document: dom.window.document, navigator: dom.window.navigator,
    HTMLElement: dom.window.HTMLElement, Node: dom.window.Node, location: dom.window.location,
    history: dom.window.history, Event: dom.window.Event, PopStateEvent: dom.window.PopStateEvent,
    addEventListener: dom.window.addEventListener.bind(dom.window),
    removeEventListener: dom.window.removeEventListener.bind(dom.window),
    dispatchEvent: dom.window.dispatchEvent.bind(dom.window), IS_REACT_ACT_ENVIRONMENT: true,
  };
  const previous = new Map(Object.keys(globals).map(k => [k, Object.getOwnPropertyDescriptor(globalThis, k)]));
  for (const [key, value] of Object.entries(globals)) Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
  const previousFetch = globalThis.fetch;
  const requests = [];
  let respond = () => new Response(JSON.stringify({ error: "Unexpected synthetic request" }), { status: 503, headers: { "Content-Type": "application/json" } });
  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input), dom.window.location.origin);
    if (url.origin !== dom.window.location.origin || !url.pathname.startsWith("/api/platform/")) throw new Error("External requests are forbidden in this test.");
    requests.push({ path: url.pathname, init });
    return respond(url, init);
  };
  let server, testing, client;
  const restore = () => {
    globalThis.fetch = previousFetch;
    dom.window.close();
    for (const [key, descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  };
  try {
    server = await createServer({
      root, configFile: false, appType: "custom", logLevel: "error",
      resolve: { alias: { "@": path.join(root, "src") }, dedupe: ["react", "react-dom"] },
      esbuild: { jsx: "automatic" }, ssr: { noExternal: [/@workspace\//] },
      server: { middlewareMode: true, watch: null, hmr: false }, optimizeDeps: { noDiscovery: true },
    });
    const React = await import("react");
    const { QueryClient, QueryClientProvider } = await import("@tanstack/react-query");
    const { Router } = await import("wouter");
    testing = await import("@testing-library/react");
    const { default: userEvent } = await import("@testing-library/user-event");
    const auth = await server.ssrLoadModule("/src/platform/auth-pages.tsx");
    const workspace = await server.ssrLoadModule("/src/platform/workspace.tsx");
    // JSDOM's window makes Query run in browser mode. Disable both GC timers
    // and explicitly clear on teardown so Node does not linger for five minutes.
    client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false, gcTime: Infinity } } });
    return {
      ...testing, ...auth, ...workspace, client, requests, React,
      user: userEvent.setup({ document: dom.window.document }),
      respond(handler) { respond = handler; },
      json(data, status = 200) { return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } }); },
      navigate(url) { dom.window.history.replaceState(null, "", url); },
      mount(Component, props = {}) {
        return testing.render(React.createElement(QueryClientProvider, { client },
          React.createElement(Router, null, React.createElement(Component, props))));
      },
      async close() { testing.cleanup(); client.clear(); await server.close(); restore(); },
    };
  } catch (error) {
    testing?.cleanup(); client?.clear(); await server?.close(); restore(); throw error;
  }
}
