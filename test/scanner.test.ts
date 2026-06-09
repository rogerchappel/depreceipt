import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { scan } from "../src/scanner.js";

test("scan summarizes a package-lock fixture", async () => {
  const root = await mkdtemp(join(tmpdir(), "depreceipt-"));
  await writeFile(
    join(root, "package-lock.json"),
    JSON.stringify(
      {
        name: "fixture",
        version: "1.0.0",
        lockfileVersion: 3,
        packages: {
          "": {
            name: "fixture",
            version: "1.0.0",
            dependencies: {
              "left-pad": "1.3.0"
            }
          },
          "node_modules/left-pad": {
            version: "1.3.0"
          }
        }
      },
      null,
      2
    )
  );

  const receipt = await scan({ cwd: root, generatedAt: "2026-06-09T00:00:00.000Z" });

  assert.equal(receipt.sources.length, 1);
  assert.equal(receipt.summary.totalPackages, 1);
  assert.equal(receipt.summary.ecosystems.npm, 1);
  assert.deepEqual(receipt.packages.map((entry) => entry.name), ["left-pad"]);
});
