# depreceipt PRD

Status: in-progress

## Summary

depreceipt turns lockfiles and installed package metadata into a compact dependency receipt: what is present, what changed, and what a reviewer should notice before shipping.

## Problem

Lockfile diffs are noisy, package manager outputs are inconsistent, and agents often update dependencies without explaining the blast radius. Maintainers need a deterministic local CLI that summarizes dependency state in review-friendly terms.

## Users

- OSS maintainers reviewing dependency changes.
- Agents making package updates.
- Developers preparing release notes or security review notes.

## V1 Scope

- Detect npm, pnpm, yarn, and Python lockfiles where present.
- Parse package names, versions, dependency kinds, and lockfile metadata.
- Compare two receipt files or current state against a saved baseline.
- Render JSON and Markdown reports.
- Provide `scan`, `diff`, and `explain` commands.
- Include lockfile fixtures and CLI smoke tests.

## Non-Goals

- Vulnerability database lookups.
- Package installation.
- Remote registry calls.

## Safety

- Read-only by default.
- Never runs install commands.
- Redacts local absolute home paths from reports.

## Inspiration

Inspired by SBOM and lockfile review tools, narrowed to a practical local dependency receipt for everyday agent-assisted changes.
