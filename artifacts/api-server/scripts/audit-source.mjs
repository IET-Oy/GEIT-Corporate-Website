import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
const root = path.resolve(import.meta.dirname, "../../..");
const findings = []; let files = 0;
const patterns = [/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/, /\bsk_(?:live|proj)_[A-Za-z0-9_-]{24,}/,
  /\bsb_secret_[A-Za-z0-9_-]{24,}/, /\bAKIA[0-9A-Z]{16}\b/];
async function scan(directory) {
  for (const item of await readdir(directory, { withFileTypes: true })) {
    const target = path.join(directory, item.name);
    if (item.isDirectory()) await scan(target);
    else if (/\.(?:ts|tsx|js|mjs|json|html|css)$/.test(item.name)) {
      files++;
      const content = await readFile(target, "utf8");
      if (patterns.some((pattern) => pattern.test(content))) findings.push(path.relative(root, target));
    }
  }
}
for (const dir of ["artifacts/api-server/src", "artifacts/geit-website/src", "lib/api-client-react/src", "artifacts/geit-website/dist/public"]) {
  await scan(path.join(root, dir));
}
console.log(JSON.stringify({ filesChecked: files, commonPrivateKeyLiteralFindings: findings.length, files: findings,
  limitation: "Pattern check of current application source/frontend build only; not a complete secret-history or data-flow scan." }));
if (findings.length) process.exitCode = 1;
