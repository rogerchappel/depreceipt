# depreceipt

Local-first dependency receipts for noisy lockfile changes.

## Status

This is an early v0.1.0 CLI for summarizing dependency lockfile state, comparing receipts, and rendering reviewer-focused explanations.

## Install

```sh
npm install
npm run build
```

## Use

Scan the current project and write a dependency receipt:

```sh
node dist/src/cli.js scan --cwd . --format markdown --output depreceipt.md
```

The markdown receipt lists every supported lockfile source and each parsed package:

```md
# Dependency Receipt

Packages: 2

## Sources
- npm (npm): `package-lock.json`

## Packages
- npm/left-pad@1.3.0 (production)
```

Compare a saved receipt with the current dependency state:

```sh
node dist/src/cli.js diff --before depreceipt.json --cwd . --format markdown
```

Render reviewer prose for a receipt or diff:

```sh
node dist/src/cli.js explain --receipt depreceipt.json
```

Run the fixture-backed CLI smoke locally:

```sh
npm test
npm run smoke
```

## Verify

```sh
npm run check
npm test
npm run smoke
npm run package:smoke
npm run release:check
```

`npm run package:smoke` builds the package and fails if the published tarball
would omit the CLI entrypoint, public API, type declarations, license, security
policy, or changelog.

## Limitations

- Receipt quality depends on the supported lockfile formats present in the target project.
- Python requirement ranges such as `django>=5` are ignored until the parser can preserve range semantics.
- The tool explains dependency changes; it does not decide whether an upgrade is safe.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution expectations. Changes should be small, reviewable, and verified before review.

## Security

See [SECURITY.md](SECURITY.md) for vulnerability reporting guidance.

## License

MIT
