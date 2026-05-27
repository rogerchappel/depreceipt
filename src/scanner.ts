import { readdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { displayPath, redactHome } from "./redact.js";
import { parseLockfile } from "./parsers.js";
import type { PackageEntry, Receipt, ScanOptions, SourceFile } from "./types.js";

const LOCKFILE_NAMES = new Set([
  "package-lock.json",
  "npm-shrinkwrap.json",
  "pnpm-lock.yaml",
  "yarn.lock",
  "requirements.txt",
  "requirements.lock",
  "poetry.lock",
  "Pipfile.lock",
]);

const SKIP_DIRS = new Set([".git", "dist", "node_modules", ".venv", "venv", "__pycache__"]);

export async function scan(options: ScanOptions): Promise<Receipt> {
  const cwd = resolve(options.cwd);
  const lockfiles = await findLockfiles(cwd);
  const sources: SourceFile[] = [];
  const packages: PackageEntry[] = [];

  for (const lockfile of lockfiles) {
    const parsed = await parseLockfile(lockfile);
    if (!parsed) {
      continue;
    }

    sources.push({
      ...parsed.source,
      path: displayPath(parsed.source.path, cwd),
    });
    packages.push(
      ...parsed.packages.map((entry) => ({
        ...entry,
        source: displayPath(entry.source, cwd),
      })),
    );
  }

  const sortedPackages = packages.sort((left, right) =>
    `${left.ecosystem}:${left.name}:${left.version}`.localeCompare(`${right.ecosystem}:${right.name}:${right.version}`),
  );

  return {
    schemaVersion: 1,
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    root: redactHome(cwd),
    sources: sources.sort((left, right) => left.path.localeCompare(right.path)),
    packages: sortedPackages,
    summary: summarize(sortedPackages),
  };
}

async function findLockfiles(cwd: string): Promise<string[]> {
  const found: string[] = [];

  async function visit(dir: string): Promise<void> {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!SKIP_DIRS.has(entry.name)) {
          await visit(fullPath);
        }
      } else if (LOCKFILE_NAMES.has(entry.name)) {
        found.push(fullPath);
      }
    }
  }

  await visit(cwd);
  return found.sort();
}

function summarize(packages: PackageEntry[]): Receipt["summary"] {
  const ecosystems: Record<string, number> = {};
  let directPackages = 0;
  let transitivePackages = 0;

  for (const entry of packages) {
    ecosystems[entry.ecosystem] = (ecosystems[entry.ecosystem] ?? 0) + 1;
    if (entry.kind === "transitive") {
      transitivePackages += 1;
    } else {
      directPackages += 1;
    }
  }

  return {
    totalPackages: packages.length,
    ecosystems,
    directPackages,
    transitivePackages,
  };
}
