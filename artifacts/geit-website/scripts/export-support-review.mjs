import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const server = await createServer({
  root, configFile: false, logLevel: "error", appType: "custom",
  resolve: { alias: { "@": path.join(root, "src") } },
  server: { middlewareMode: true, watch: null, hmr: false },
  optimizeDeps: { noDiscovery: true },
});
const escape = text => String(text).replace(/[&<>"']/g, char => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
})[char]);
const row = (label, english, draft, locale) => `<tr><th>${escape(label)}</th><td lang="en">${escape(english)}</td><td lang="${locale}">${escape(draft)}</td></tr>`;
try {
  const { getSaasFaq } = await server.ssrLoadModule("/src/data/saas-faq.ts");
  const { supportCopy, supportReview } = await server.ssrLoadModule("/src/lib/translations/support.ts");
  const { translate } = await server.ssrLoadModule("/src/lib/i18n.ts");
  const source = getSaasFaq("en");
  const sections = ["fr", "rw", "sw"].map(locale => {
    const faqRows = getSaasFaq(locale).map((draft, i) => {
      const english = source[i];
      return `<tbody><tr><th colspan="3">${escape(english.id)} — ${escape(english.status)}</th></tr>` +
        ["question", "answer", "statusNote"].map(field => row(field, english[field], draft[field], locale)).join("") +
        row("keywords", english.keywords.join(", "), draft.keywords.join(", "), locale) +
        draft.links.map((link, j) => row(link.href, english.links[j].label, link.label, locale)).join("") + "</tbody>";
    }).join("");
    return `<section id="${locale}"><h2>${{ fr: "French", rw: "Kinyarwanda", sw: "Swahili" }[locale]} — ${escape(supportReview[locale].status)}</h2>
      <table><thead><tr><th>Field / route</th><th>English source</th><th>Draft</th></tr></thead>${faqRows}</table>
      <h3>Chat and FAQ interface</h3><table><thead><tr><th>Field</th><th>English source</th><th>Draft</th></tr></thead><tbody>
      ${Object.keys(supportCopy.en).map(key => row(key, supportCopy.en[key], supportCopy[locale][key], locale)).join("")}
      ${row("review notice", translate("en", "contentLanguageNotice"), translate(locale, "contentLanguageNotice"), locale)}
      </tbody></table></section>`;
  }).join("");
  const html = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
    <title>GEIT FAQ and support — human review packet</title>
    <style>body{font:16px/1.6 system-ui,sans-serif;color:#10243a;max-width:1300px;margin:auto;padding:24px}h1,h2{line-height:1.2}nav{display:flex;gap:24px;flex-wrap:wrap}a{color:#116b54}table{border-collapse:collapse;width:100%;table-layout:fixed;margin:24px 0}td,th{padding:12px;border:1px solid #ccd6dc;text-align:left;vertical-align:top;overflow-wrap:anywhere}th:first-child{width:16%}thead,tbody>tr:first-child:has(th[colspan]){background:#edf4f1}section{margin:48px 0}.notice{border-left:4px solid #c69932;padding:16px;background:#fff8e8}@media(max-width:600px){body{padding:12px}td,th{padding:6px;font-size:13px}th:first-child{width:19%}}@media print{section{break-before:page}tr{break-inside:avoid}}</style>
    <h1>GEIT FAQ and support: human review packet</h1>
    <p class="notice"><strong>Support human review approved, as confirmed by the project owner.</strong> No reviewer identity was supplied. English remains the factual source. This packet does not approve other website translations.</p>
    <p>Review every question, answer, status note, keyword, link label and interface string. Return corrections by language and field, and confirm which language you reviewed. Check the meaning, not just grammar.</p>
    <p>Preserve: internal testing; manual import only, 5,000 rows / 2 MiB; at least 35 consecutive complete days for forecasts; save-time alerts with no delivery; baseline-only scenarios; unavailable report hub; no certification claim; no enquiry sending or storage; no AI connection, account access or ticket creation.</p>
    <nav><a href="#fr">French</a><a href="#rw">Kinyarwanda</a><a href="#sw">Swahili</a></nav>${sections}</html>`;
  const out = path.resolve(root, "../../generated-artifacts/geit-support-language-review.html");
  await fs.mkdir(path.dirname(out), { recursive: true });
  await fs.writeFile(out, html);
  console.log(path.relative(path.resolve(root, "../.."), out));
} finally {
  await server.close();
}
