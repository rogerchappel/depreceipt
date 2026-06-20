import assert from "node:assert/strict";
import { test } from "node:test";

import { diffReceipts } from "../src/diff.js";
import { explainDiff, formatDiff } from "../src/format.js";
import type { Receipt } from "../src/types.js";

const before: Receipt = {
  schemaVersion: 1,
  generatedAt: "2026-06-20T00:00:00.000Z",
  root: "/fixture/before",
  sources: [{ path: "package-lock.json", manager: "npm", ecosystem: "npm" }],
  packages: [
    { name: "left-pad", version: "1.3.0", ecosystem: "npm", kind: "production", source: "package-lock.json" },
    { name: "old-only", version: "0.1.0", ecosystem: "npm", kind: "development", source: "package-lock.json" },
    { name: "requests", version: "2.31.0", ecosystem: "python", kind: "unknown", source: "requirements.txt" },
  ],
  summary: {
    totalPackages: 3,
    directPackages: 3,
    transitivePackages: 0,
    ecosystems: { npm: 2, python: 1 },
  },
};

const after: Receipt = {
  ...before,
  root: "/fixture/after",
  packages: [
    { name: "new-only", version: "2.0.0", ecosystem: "npm", kind: "optional", source: "package-lock.json" },
    { name: "left-pad", version: "1.3.0", ecosystem: "npm", kind: "development", source: "package-lock.json" },
    { name: "requests", version: "2.32.3", ecosystem: "python", kind: "unknown", source: "requirements.txt" },
  ],
};

test("diffReceipts reports added, removed, and changed packages in stable order", () => {
  const diff = diffReceipts(before, after);

  assert.deepEqual(diff.summary, { added: 1, removed: 1, changed: 2 });
  assert.deepEqual(diff.added.map((entry) => entry.name), ["new-only"]);
  assert.deepEqual(diff.removed.map((entry) => entry.name), ["old-only"]);
  assert.deepEqual(
    diff.changed.map((entry) => `${entry.ecosystem}:${entry.name}`),
    ["npm:left-pad", "python:requests"],
  );
});

test("markdown diff output includes reviewer-focused empty sections", () => {
  const markdown = formatDiff(diffReceipts(before, after), "markdown");

  assert.match(markdown, /# Dependency Receipt Diff/);
  assert.match(markdown, /Added: 1/);
  assert.match(markdown, /- npm\/new-only@2.0.0 \(optional\)/);
  assert.match(markdown, /- npm\/old-only@0.1.0 \(development\)/);
});

test("explainDiff renders changed versions and package movement", () => {
  const explanation = explainDiff(diffReceipts(before, after));

  assert.match(explanation, /adds 1, removes 1, and changes 2/);
  assert.match(explanation, /npm\/left-pad: 1.3.0 -> 1.3.0/);
  assert.match(explanation, /python\/requests: 2.31.0 -> 2.32.3/);
  assert.match(explanation, /Removed packages/);
});
