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
node dist/cli.js scan --cwd . --format markdown --output depreceipt.md
```

Compare a saved receipt with the current dependency state:

```sh
node dist/cli.js diff --before depreceipt.json --cwd . --format markdown
```

Render reviewer prose for a receipt or diff:

```sh
node dist/cli.js explain --receipt depreceipt.json
```

## Verify

```sh
npm run release:check
```

## Limitations

- Receipt quality depends on the supported lockfile formats present in the target project.
- The tool explains dependency changes; it does not decide whether an upgrade is safe.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution expectations. Changes should be small, reviewable, and verified before review.

## Security

See [SECURITY.md](SECURITY.md) for vulnerability reporting guidance.

## License

MIT
