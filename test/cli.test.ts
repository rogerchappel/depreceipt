import assert from "node:assert/strict";
import { cp, mkdtemp, readFile } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { main } from "../src/cli.js";

const fixtureRoot = join(process.cwd(), "test", "fixtures", "mixed-lockfiles");

test("scan command writes a redacted receipt for mixed lockfiles", async () => {
  const project = await copyFixture("depreceipt-cli-scan-");
  const output = join(project, "receipt.json");

  const exitCode = await withCapturedStdout(() => main(["scan", "--cwd", project, "--output", output]));
  const receipt = JSON.parse(await readFile(output, "utf8")) as {
    root: string;
    summary: { totalPackages: number; ecosystems: Record<string, number> };
    sources: Array<{ manager: string; path: string }>;
    packages: Array<{ name: string; kind: string }>;
  };

  assert.equal(exitCode.code, 0);
  assert.equal(exitCode.stdout, "");
  assert.equal(receipt.root.includes(homedir()), false);
  assert.deepEqual(
    receipt.sources.map((source) => `${source.manager}:${source.path}`),
    ["npm:package-lock.json", "pip:requirements.txt"],
  );
  assert.deepEqual(receipt.summary, {
    totalPackages: 5,
    ecosystems: { npm: 3, python: 2 },
    directPackages: 5,
    transitivePackages: 0,
  });
  assert.deepEqual(
    receipt.packages.map((entry) => `${entry.name}:${entry.kind}`),
    ["@types/node:development", "left-pad:production", "optional-peer:optional", "requests:unknown", "rich:unknown"],
  );
});

test("explain command renders reviewer notes from the fixture receipt", async () => {
  const project = await copyFixture("depreceipt-cli-explain-");
  const receiptPath = join(project, "receipt.json");
  assert.equal((await withCapturedStdout(() => main(["scan", "--cwd", project, "--output", receiptPath]))).code, 0);

  const result = await withCapturedStdout(() => main(["explain", "--receipt", receiptPath]));

  assert.equal(result.code, 0);
  assert.match(result.stdout, /5 packages found across 2 source file\(s\)\./);
  assert.match(result.stdout, /optional-peer@0\.2\.0 is optional/);
});

async function copyFixture(prefix: string): Promise<string> {
  const project = await mkdtemp(join(tmpdir(), prefix));
  await cp(fixtureRoot, project, { recursive: true });
  return project;
}

async function withCapturedStdout(action: () => Promise<number>): Promise<{ code: number; stdout: string }> {
  let stdout = "";
  const originalWrite = process.stdout.write;
  process.stdout.write = ((chunk: string | Uint8Array): boolean => {
    stdout += String(chunk);
    return true;
  }) as typeof process.stdout.write;

  try {
    return { code: await action(), stdout };
  } finally {
    process.stdout.write = originalWrite;
  }
}
