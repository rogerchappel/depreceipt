import type { PackageEntry, Receipt, ReceiptDiff } from "./types.js";

export function diffReceipts(before: Receipt, after: Receipt): ReceiptDiff {
  const beforeByKey = mapByPackageIdentity(before.packages);
  const afterByKey = mapByPackageIdentity(after.packages);
  const added: PackageEntry[] = [];
  const removed: PackageEntry[] = [];
  const changed: ReceiptDiff["changed"] = [];

  for (const [key, beforeEntry] of beforeByKey) {
    const afterEntry = afterByKey.get(key);
    if (!afterEntry) {
      removed.push(beforeEntry);
    } else if (beforeEntry.version !== afterEntry.version || beforeEntry.kind !== afterEntry.kind) {
      changed.push({
        name: beforeEntry.name,
        ecosystem: beforeEntry.ecosystem,
        before: beforeEntry,
        after: afterEntry,
      });
    }
  }

  for (const [key, afterEntry] of afterByKey) {
    if (!beforeByKey.has(key)) {
      added.push(afterEntry);
    }
  }

  return {
    schemaVersion: 1,
    before: before.root,
    after: after.root,
    added: sortPackages(added),
    removed: sortPackages(removed),
    changed: changed.sort((left, right) => `${left.ecosystem}:${left.name}`.localeCompare(`${right.ecosystem}:${right.name}`)),
    summary: {
      added: added.length,
      removed: removed.length,
      changed: changed.length,
    },
  };
}

function mapByPackageIdentity(packages: PackageEntry[]): Map<string, PackageEntry> {
  return new Map(packages.map((entry) => [`${entry.ecosystem}:${entry.name}`, entry]));
}

function sortPackages(packages: PackageEntry[]): PackageEntry[] {
  return packages.sort((left, right) => `${left.ecosystem}:${left.name}`.localeCompare(`${right.ecosystem}:${right.name}`));
}
