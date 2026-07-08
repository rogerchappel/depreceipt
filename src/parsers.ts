import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import type { DependencyKind, Ecosystem, PackageEntry, SourceFile } from "./types.js";

interface ParseResult {
  source: SourceFile;
  packages: PackageEntry[];
}

const PYTHON_VERSION_PATTERN = /^([A-Za-z0-9_.-]+)\s*(===|==|~=|!=|<=|>=|<|>)\s*([^,;\s]+)/;

export async function parseLockfile(path: string): Promise<ParseResult | null> {
  const fileName = basename(path);
  const raw = await readFile(path, "utf8");

  if (fileName === "package-lock.json" || fileName === "npm-shrinkwrap.json") {
    return parsePackageLock(path, raw);
  }

  if (fileName === "pnpm-lock.yaml") {
    return parsePnpmLock(path, raw);
  }

  if (fileName === "yarn.lock") {
    return parseYarnLock(path, raw);
  }

  if (fileName === "requirements.txt" || fileName === "requirements.lock") {
    return parseRequirements(path, raw);
  }

  if (fileName === "poetry.lock") {
    return parsePoetryLock(path, raw);
  }

  if (fileName === "Pipfile.lock") {
    return parsePipfileLock(path, raw);
  }

  return null;
}

function parsePackageLock(path: string, raw: string): ParseResult {
  const data = JSON.parse(raw) as {
    packages?: Record<string, { version?: string; dev?: boolean; optional?: boolean; peer?: boolean }>;
    dependencies?: Record<string, { version?: string; dev?: boolean; optional?: boolean }>;
  };
  const packages: PackageEntry[] = [];

  if (data.packages) {
    for (const [locator, entry] of Object.entries(data.packages)) {
      if (!locator || !entry.version) {
        continue;
      }
      const name = locator.replace(/^node_modules\//, "");
      packages.push(packageEntry(name, entry.version, "npm", kindFromFlags(entry), path));
    }
  } else if (data.dependencies) {
    for (const [name, entry] of Object.entries(data.dependencies)) {
      if (entry.version) {
        packages.push(packageEntry(name, entry.version, "npm", kindFromFlags(entry), path));
      }
    }
  }

  return {
    source: { path, ecosystem: "npm", manager: "npm" },
    packages: uniquePackages(packages),
  };
}

function parsePnpmLock(path: string, raw: string): ParseResult {
  const packages: PackageEntry[] = [];
  const directKinds = parsePnpmDirectDependencies(raw);
  const packageBlock = raw.match(/^packages:\n([\s\S]*)/m)?.[1] ?? "";

  for (const line of packageBlock.split("\n")) {
    const match = line.match(/^\s{2}\/((?:@[^/]+\/)?[^/@\s]+)@([^:\s]+):\s*$/);
    if (!match) {
      continue;
    }
    const [, name, version] = match;
    packages.push(packageEntry(name, cleanVersion(version), "pnpm", directKinds.get(name) ?? "transitive", path));
  }

  for (const [name, kind] of directKinds) {
    if (!packages.some((entry) => entry.name === name)) {
      packages.push(packageEntry(name, "unknown", "pnpm", kind, path));
    }
  }

  return {
    source: { path, ecosystem: "pnpm", manager: "pnpm" },
    packages: uniquePackages(packages),
  };
}

function parsePnpmDirectDependencies(raw: string): Map<string, DependencyKind> {
  const result = new Map<string, DependencyKind>();
  let section: DependencyKind | null = null;

  for (const line of raw.split("\n")) {
    if (/^\s{2}dependencies:\s*$/.test(line)) {
      section = "production";
      continue;
    }
    if (/^\s{2}devDependencies:\s*$/.test(line)) {
      section = "development";
      continue;
    }
    if (/^\s{2}optionalDependencies:\s*$/.test(line)) {
      section = "optional";
      continue;
    }
    if (/^\S/.test(line)) {
      section = null;
    }

    const match = line.match(/^\s{4}((?:@[^/]+\/)?[^:]+):/);
    if (section && match) {
      result.set(match[1], section);
    }
  }

  return result;
}

function parseYarnLock(path: string, raw: string): ParseResult {
  const packages: PackageEntry[] = [];
  const lines = raw.split("\n");

  for (let index = 0; index < lines.length; index += 1) {
    const header = lines[index];
    if (!header || header.startsWith(" ") || header.startsWith("#") || !header.endsWith(":")) {
      continue;
    }
    const name = yarnNameFromHeader(header);
    const versionLine = lines.slice(index + 1, index + 8).find((line) => /^\s{2}version\s+/.test(line));
    const version = versionLine?.match(/^\s{2}version\s+"?([^"\s]+)"?/)?.[1];
    if (name && version) {
      packages.push(packageEntry(name, version, "yarn", "unknown", path));
    }
  }

  return {
    source: { path, ecosystem: "yarn", manager: "yarn" },
    packages: uniquePackages(packages),
  };
}

function yarnNameFromHeader(header: string): string | null {
  const firstDescriptor = header.replace(/:$/, "").split(",")[0]?.trim().replace(/^"|"$/g, "");
  if (!firstDescriptor) {
    return null;
  }
  if (firstDescriptor.startsWith("@")) {
    const parts = firstDescriptor.split("@");
    return `@${parts[1]}`;
  }
  return firstDescriptor.split("@")[0] ?? null;
}

function parseRequirements(path: string, raw: string): ParseResult {
  const packages = raw
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"))
    .flatMap((line) => {
      const match = line.match(PYTHON_VERSION_PATTERN);
      return match ? [packageEntry(normalizePythonName(match[1]), `${match[2]}${match[3]}`, "python", "unknown", path)] : [];
    });

  return {
    source: { path, ecosystem: "python", manager: "pip" },
    packages: uniquePackages(packages),
  };
}

function parsePoetryLock(path: string, raw: string): ParseResult {
  const packages: PackageEntry[] = [];
  let currentName: string | null = null;
  let currentVersion: string | null = null;

  for (const line of raw.split("\n")) {
    if (line.trim() === "[[package]]") {
      if (currentName && currentVersion) {
        packages.push(packageEntry(normalizePythonName(currentName), currentVersion, "python", "unknown", path));
      }
      currentName = null;
      currentVersion = null;
      continue;
    }
    currentName ??= line.match(/^name = "([^"]+)"/)?.[1] ?? null;
    currentVersion ??= line.match(/^version = "([^"]+)"/)?.[1] ?? null;
  }

  if (currentName && currentVersion) {
    packages.push(packageEntry(normalizePythonName(currentName), currentVersion, "python", "unknown", path));
  }

  return {
    source: { path, ecosystem: "python", manager: "poetry" },
    packages: uniquePackages(packages),
  };
}

function parsePipfileLock(path: string, raw: string): ParseResult {
  const data = JSON.parse(raw) as Record<string, Record<string, { version?: string }>>;
  const packages: PackageEntry[] = [];

  for (const [section, kind] of [
    ["default", "production"],
    ["develop", "development"],
  ] as const) {
    for (const [name, entry] of Object.entries(data[section] ?? {})) {
      packages.push(packageEntry(normalizePythonName(name), entry.version?.replace(/^==/, "") ?? "unknown", "python", kind, path));
    }
  }

  return {
    source: { path, ecosystem: "python", manager: "pipenv" },
    packages: uniquePackages(packages),
  };
}

function packageEntry(name: string, version: string, ecosystem: Ecosystem, kind: DependencyKind, source: string): PackageEntry {
  return {
    name,
    version,
    ecosystem,
    kind,
    source,
  };
}

function kindFromFlags(entry: { dev?: boolean; optional?: boolean; peer?: boolean }): DependencyKind {
  if (entry.optional) {
    return "optional";
  }
  if (entry.peer) {
    return "peer";
  }
  if (entry.dev) {
    return "development";
  }
  return "production";
}

function cleanVersion(version: string): string {
  return version.replace(/\(.+\)$/, "");
}

function normalizePythonName(name: string): string {
  return name.toLowerCase().replace(/_/g, "-");
}

function uniquePackages(packages: PackageEntry[]): PackageEntry[] {
  const seen = new Set<string>();
  return packages
    .sort((left, right) => `${left.ecosystem}:${left.name}`.localeCompare(`${right.ecosystem}:${right.name}`))
    .filter((entry) => {
      const key = `${entry.ecosystem}:${entry.name}:${entry.version}:${entry.source}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
}
