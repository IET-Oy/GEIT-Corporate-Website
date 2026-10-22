import { JSDOM } from "jsdom";
import path from "node:path";
import { createServer } from "vite";

/** Mount the real components. Only answer timing is controlled, never answer content. */
export async function supportRuntime(root) {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost/" });
  const globals = {
    window: dom.window, document: dom.window.document, navigator: dom.window.navigator,
    HTMLElement: dom.window.HTMLElement, Node: dom.window.Node,
    CustomEvent: dom.window.CustomEvent, getComputedStyle: dom.window.getComputedStyle,
    location: dom.window.location, history: dom.window.history, Event: dom.window.Event,
    addEventListener: dom.window.addEventListener.bind(dom.window),
    removeEventListener: dom.window.removeEventListener.bind(dom.window),
    dispatchEvent: dom.window.dispatchEvent.bind(dom.window),
    IS_REACT_ACT_ENVIRONMENT: true,
  };
  const previous = new Map(Object.keys(globals).map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  for (const [key, value] of Object.entries(globals)) {
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
  }
  // JSDOM has no layout/scrolling; this is unrelated to the behavior under test.
  dom.window.HTMLElement.prototype.scrollTo = () => {};
  const virtualId = "virtual:support-answer-timing";
  let server;
  const restore = () => {
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
      esbuild: { jsx: "automatic" },
      server: { middlewareMode: true, watch: null, hmr: false },
      optimizeDeps: { noDiscovery: true },
      plugins: [{
        name: "test-only-support-answer-timing",
        resolveId(id) { if (id === virtualId) return `\0${virtualId}`; },
        transform(source, id) {
          if (id.endsWith("/components/support-widget.tsx")) {
            return source.replace('"@/data/saas-faq"', `"${virtualId}"`);
          }
        },
        load(id) {
          if (id !== `\0${virtualId}`) return;
          return `
            export * from "/src/data/saas-faq.ts";
            import { answerQuestion as realAnswer } from "/src/data/saas-faq.ts";
            let hold = false;
            export const pending = [];
            export function deferAnswers(value) { hold = value; }
            export function answerQuestion(...args) {
              if (!hold) return realAnswer(...args);
              return new Promise(resolve => pending.push({
                question: args[0], language: args[3],
                release: async () => resolve(await realAnswer(...args))
              }));
            }
          `;
        },
      }],
    });
    // React DOM must be imported after the DOM globals have been installed.
    const testing = await import("@testing-library/react");
    const { default: userEvent } = await import("@testing-library/user-event");
    const load = file => server.ssrLoadModule(`/src/${file}`);
    const [language, selector, section, widget, notice, faq, translations, timing] = await Promise.all([
      load("lib/language-context.tsx"), load("components/language-selector.tsx"),
      load("components/saas-faq-section.tsx"), load("components/support-widget.tsx"),
      load("components/support-language-notice.tsx"), load("data/saas-faq.ts"),
      load("lib/translations/support.ts"), server.ssrLoadModule(virtualId),
    ]);
    return {
      ...testing, user: userEvent.setup({ document: dom.window.document }),
      LanguageProvider: language.LanguageProvider, LanguageSelector: selector.default,
      SaasFaqSection: section.SaasFaqSection, SupportWidget: widget.SupportWidget,
      SupportLanguageNotice: notice.SupportLanguageNotice, faq, ...translations, timing,
      async close() {
        testing.cleanup();
        await server.close();
        restore();
      },
    };
  } catch (error) {
    await server?.close();
    restore();
    throw error;
  }
}
