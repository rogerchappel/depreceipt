import type { Receipt, ReceiptDiff } from "./types.js";

export type OutputFormat = "json" | "markdown";

export function formatReceipt(receipt: Receipt, format: OutputFormat): string {
  if (format === "json") {
    return `${JSON.stringify(receipt, null, 2)}\n`;
  }

  const lines = [
    "# Dependency Receipt",
    "",
    `Generated: ${receipt.generatedAt}`,
    `Root: ${receipt.root}`,
    `Packages: ${receipt.summary.totalPackages}`,
    "",
    "## Sources",
    ...receipt.sources.map((source) => `- ${source.manager} (${source.ecosystem}): \`${source.path}\``),
    "",
    "## Packages",
    ...receipt.packages.map((entry) => `- ${entry.ecosystem}/${entry.name}@${entry.version} (${entry.kind})`),
  ];

  return `${lines.join("\n")}\n`;
}

export function formatDiff(diff: ReceiptDiff, format: OutputFormat): string {
  if (format === "json") {
    return `${JSON.stringify(diff, null, 2)}\n`;
  }

  const lines = [
    "# Dependency Receipt Diff",
    "",
    `Added: ${diff.summary.added}`,
    `Removed: ${diff.summary.removed}`,
    `Changed: ${diff.summary.changed}`,
    "",
    "## Added",
    ...orNone(diff.added.map((entry) => `- ${entry.ecosystem}/${entry.name}@${entry.version} (${entry.kind})`)),
    "",
    "## Removed",
    ...orNone(diff.removed.map((entry) => `- ${entry.ecosystem}/${entry.name}@${entry.version} (${entry.kind})`)),
    "",
    "## Changed",
    ...orNone(
      diff.changed.map(
        (entry) => `- ${entry.ecosystem}/${entry.name}: ${entry.before.version} (${entry.before.kind}) -> ${entry.after.version} (${entry.after.kind})`,
      ),
    ),
  ];

  return `${lines.join("\n")}\n`;
}

export function explainReceipt(receipt: Receipt): string {
  const ecosystems = Object.entries(receipt.summary.ecosystems)
    .map(([name, count]) => `${name}: ${count}`)
    .join(", ");
  const noisyKinds = receipt.packages.filter((entry) => entry.kind === "optional" || entry.kind === "peer");

  const lines = [
    "# Dependency Receipt Explanation",
    "",
    `${receipt.summary.totalPackages} packages found across ${receipt.sources.length} source file(s).`,
    ecosystems ? `Ecosystem mix: ${ecosystems}.` : "No supported lockfiles were found.",
    `${receipt.summary.directPackages} direct/unknown package(s), ${receipt.summary.transitivePackages} transitive package(s).`,
  ];

  if (noisyKinds.length > 0) {
    lines.push("", "Packages reviewers may want to notice:");
    lines.push(...noisyKinds.map((entry) => `- ${entry.ecosystem}/${entry.name}@${entry.version} is ${entry.kind}`));
  }

  return `${lines.join("\n")}\n`;
}

export function explainDiff(diff: ReceiptDiff): string {
  const lines = [
    "# Dependency Change Explanation",
    "",
    `This change adds ${diff.summary.added}, removes ${diff.summary.removed}, and changes ${diff.summary.changed} package(s).`,
  ];

  if (diff.changed.length > 0) {
    lines.push("", "Version or kind changes:");
    lines.push(...diff.changed.map((entry) => `- ${entry.ecosystem}/${entry.name}: ${entry.before.version} -> ${entry.after.version}`));
  }

  if (diff.added.length > 0) {
    lines.push("", "New packages:");
    lines.push(...diff.added.map((entry) => `- ${entry.ecosystem}/${entry.name}@${entry.version}`));
  }

  if (diff.removed.length > 0) {
    lines.push("", "Removed packages:");
    lines.push(...diff.removed.map((entry) => `- ${entry.ecosystem}/${entry.name}@${entry.version}`));
  }

  return `${lines.join("\n")}\n`;
}

function orNone(lines: string[]): string[] {
  return lines.length > 0 ? lines : ["- None"];
}
