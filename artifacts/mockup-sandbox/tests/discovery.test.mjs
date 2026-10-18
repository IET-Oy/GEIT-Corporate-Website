import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { discoverMockupFiles } from "../mockupPreviewPlugin.ts";

test("native discovery includes nested components and excludes private, hidden and non-component files", () => {
  const root = mkdtempSync(path.join(tmpdir(), "geit-discovery-"));
  try {
    for (const file of ["Visible.tsx", "nested/Good.tsx", "_Ignored.tsx", "_private/Secret.tsx", ".hidden/Hidden.tsx", "nested/readme.md"]) {
      const target = path.join(root, "src/components/mockups", file);
      mkdirSync(path.dirname(target), { recursive: true }); writeFileSync(target, "");
    }
    assert.deepEqual(discoverMockupFiles(root), ["src/components/mockups/Visible.tsx", "src/components/mockups/nested/Good.tsx"]);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
