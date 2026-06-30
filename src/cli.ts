#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { diffReceipts } from "./diff.js";
import { explainDiff, explainReceipt, formatDiff, formatReceipt, type OutputFormat } from "./format.js";
import { scan } from "./scanner.js";
import type { Receipt } from "./types.js";

const VERSION = "0.1.0";

interface ParsedArgs {
  command?: string;
  cwd: string;
  format: OutputFormat;
  output?: string;
  before?: string;
  after?: string;
  receipt?: string;
  help: boolean;
  version: boolean;
}

export async function main(argv: string[] = process.argv.slice(2)): Promise<number> {
  try {
    const args = parseArgs(argv);
    if (args.version) {
      process.stdout.write(`${VERSION}\n`);
      return 0;
    }

    if (args.help || !args.command) {
      process.stdout.write(helpText());
      return 0;
    }

    if (args.command === "scan") {
      const receipt = await scan({ cwd: args.cwd });
      await writeOutput(formatReceipt(receipt, args.format), args.output);
      return 0;
    }

    if (args.command === "diff") {
      const before = args.before ? await readReceipt(args.before) : await readReceipt(resolve(args.cwd, "depreceipt.json"));
      const after = args.after ? await readReceipt(args.after) : await scan({ cwd: args.cwd });
      await writeOutput(formatDiff(diffReceipts(before, after), args.format), args.output);
      return 0;
    }

    if (args.command === "explain") {
      if (args.before || args.after) {
        const before = args.before ? await readReceipt(args.before) : await readReceipt(resolve(args.cwd, "depreceipt.json"));
        const after = args.after ? await readReceipt(args.after) : await scan({ cwd: args.cwd });
        await writeOutput(explainDiff(diffReceipts(before, after)), args.output);
        return 0;
      }

      const receipt = args.receipt ? await readReceipt(args.receipt) : await scan({ cwd: args.cwd });
      await writeOutput(explainReceipt(receipt), args.output);
      return 0;
    }

    throw new Error(`Unknown command: ${args.command}`);
  } catch (error) {
    process.stderr.write(`depreceipt: ${error instanceof Error ? error.message : String(error)}\n`);
    return 1;
  }
}

function parseArgs(argv: string[]): ParsedArgs {
  const command = argv[0]?.startsWith("-") ? undefined : argv[0];
  const args: ParsedArgs = {
    command,
    cwd: process.cwd(),
    format: "json",
    help: false,
    version: false,
  };

  for (let index = command ? 1 : 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--help" || token === "-h") {
      args.help = true;
    } else if (token === "--version" || token === "-v") {
      args.version = true;
    } else if (token === "--cwd") {
      args.cwd = requireValue(argv, (index += 1), token);
    } else if (token === "--format") {
      args.format = parseFormat(requireValue(argv, (index += 1), token));
    } else if (token === "--json") {
      args.format = "json";
    } else if (token === "--markdown" || token === "--md") {
      args.format = "markdown";
    } else if (token === "--output" || token === "-o") {
      args.output = requireValue(argv, (index += 1), token);
    } else if (token === "--before") {
      args.before = requireValue(argv, (index += 1), token);
    } else if (token === "--after") {
      args.after = requireValue(argv, (index += 1), token);
    } else if (token === "--receipt") {
      args.receipt = requireValue(argv, (index += 1), token);
    } else {
      throw new Error(`Unknown option: ${token}`);
    }
  }

  return args;
}

function parseFormat(value: string): OutputFormat {
  if (value === "json" || value === "markdown") {
    return value;
  }
  throw new Error(`Unsupported format: ${value}`);
}

function requireValue(argv: string[], index: number, option: string): string {
  const value = argv[index];
  if (!value || value.startsWith("--")) {
    throw new Error(`${option} requires a value`);
  }
  return value;
}

async function readReceipt(path: string): Promise<Receipt> {
  return JSON.parse(await readFile(path, "utf8")) as Receipt;
}

async function writeOutput(content: string, output?: string): Promise<void> {
  if (output) {
    await writeFile(output, content);
    return;
  }
  process.stdout.write(content);
}

function helpText(): string {
  return `depreceipt

Usage:
  depreceipt scan [--cwd DIR] [--format json|markdown] [--output FILE]
  depreceipt diff [--before FILE] [--after FILE] [--cwd DIR] [--format json|markdown]
  depreceipt explain [--receipt FILE] [--before FILE --after FILE] [--cwd DIR]
  depreceipt --version

Commands:
  scan      Read supported lockfiles and emit a dependency receipt.
  diff      Compare two receipts, or a baseline depreceipt.json against current state.
  explain   Render reviewer-focused prose for a receipt or receipt diff.
`;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  process.exitCode = await main();
}
