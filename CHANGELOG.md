# Changelog

All notable changes to this project will be documented in this file.

This project follows the [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
format and uses semantic versioning when versioned releases are published.

## [Unreleased]

### Added

- CLI `--version` output with unit, smoke, and package dry-run coverage.
- Fixture-backed CLI smoke tests for mixed npm and Python lockfiles.
- README examples for generated markdown receipts and local fixture verification.
- Initial project setup.

### Changed

- CLI `--version` now reads the packaged `package.json` version to prevent release drift.
- Documented current Python requirement-range parsing limits for reviewers.
- Documented local verification, npm package metadata, and pack contents for the next public release.

## Release Links

- Unreleased:
  `https://github.com/rogerchappel/depreceipt/compare/...HEAD`
- Latest release:
  `https://github.com/rogerchappel/depreceipt/releases/latest`

Replace placeholder links once the first release tag exists.
