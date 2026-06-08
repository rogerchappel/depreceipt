import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { parseLockfile } from "../src/parsers.js";
import { scan } from "../src/scanner.js";

test("parseLockfile classifies package-lock dependency kinds", async () => {
  const root = await mkdtemp(join(tmpdir(), "depreceipt-package-lock-"));
  const lockfile = join(root, "package-lock.json");
  await writeFile(
    lockfile,
    JSON.stringify({
      lockfileVersion: 3,
      packages: {
        "": { name: "fixture" },
        "node_modules/@scope/prod": { version: "1.2.3" },
        "node_modules/dev-only": { version: "4.5.6", dev: true },
        "node_modules/optional-only": { version: "7.8.9", optional: true },
      },
    }),
  );

  const parsed = await parseLockfile(lockfile);

  assert.equal(parsed?.source.manager, "npm");
  assert.deepEqual(
    parsed?.packages.map((entry) => [entry.name, entry.version, entry.kind]),
    [
      ["@scope/prod", "1.2.3", "production"],
      ["dev-only", "4.5.6", "development"],
      ["optional-only", "7.8.9", "optional"],
    ],
  );
});

test("scan summarizes nested Node and Python lockfiles", async () => {
  const root = await mkdtemp(join(tmpdir(), "depreceipt-scan-"));
  await writeFile(
    join(root, "package-lock.json"),
    JSON.stringify({
      lockfileVersion: 3,
      packages: {
        "": { name: "fixture" },
        "node_modules/prod": { version: "1.0.0" },
        "node_modules/dev": { version: "2.0.0", dev: true },
      },
    }),
  );
  await writeFile(join(root, "requirements.txt"), "Requests==2.32.3\n# comment\ninvalid\n");

  const receipt = await scan({ cwd: root, generatedAt: "2026-06-09T00:00:00.000Z" });

  assert.equal(receipt.generatedAt, "2026-06-09T00:00:00.000Z");
  assert.deepEqual(receipt.sources.map((source) => source.manager), ["npm", "pip"]);
  assert.equal(receipt.summary.totalPackages, 3);
  assert.equal(receipt.summary.directPackages, 3);
  assert.equal(receipt.summary.transitivePackages, 0);
  assert.deepEqual(receipt.summary.ecosystems, { npm: 2, python: 1 });
  assert.deepEqual(
    receipt.packages.map((entry) => `${entry.ecosystem}:${entry.name}:${entry.version}:${entry.kind}`),
    ["npm:dev:2.0.0:development", "npm:prod:1.0.0:production", "python:requests:2.32.3:unknown"],
  );
});
