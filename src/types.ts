export type Ecosystem = "npm" | "pnpm" | "yarn" | "python";

export type DependencyKind = "production" | "development" | "optional" | "peer" | "transitive" | "unknown";

export interface PackageEntry {
  name: string;
  version: string;
  ecosystem: Ecosystem;
  kind: DependencyKind;
  source: string;
  metadata?: Record<string, string | number | boolean>;
}

export interface SourceFile {
  path: string;
  ecosystem: Ecosystem;
  manager: string;
}

export interface Receipt {
  schemaVersion: 1;
  generatedAt: string;
  root: string;
  sources: SourceFile[];
  packages: PackageEntry[];
  summary: {
    totalPackages: number;
    ecosystems: Record<string, number>;
    directPackages: number;
    transitivePackages: number;
  };
}

export interface ReceiptDiff {
  schemaVersion: 1;
  before: string;
  after: string;
  added: PackageEntry[];
  removed: PackageEntry[];
  changed: Array<{
    name: string;
    ecosystem: Ecosystem;
    before: PackageEntry;
    after: PackageEntry;
  }>;
  summary: {
    added: number;
    removed: number;
    changed: number;
  };
}

export interface ScanOptions {
  cwd: string;
  generatedAt?: string;
}
