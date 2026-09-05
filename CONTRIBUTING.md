# Contributing

Thank you for helping improve OpenVector.

## Ground rules

- Keep V1 local-first. Do not add a database, cloud service, or paid API.
- Put calculations in `src/metrics/`, not in React components.
- Do not add individual-ranking metrics (lines of code, commits per person, hours online).
- Prefer team trends and explicit empty states over invented numbers.
- Match the existing TypeScript style: small functions, named exports, no unnecessary abstractions.

## Workflow

1. Fork and create a branch.
2. Add or update unit tests for metric changes.
3. Run `npm test`.
4. If you change CSV columns, update `src/data/schemas.ts` and `docs/data-format.md`.
5. If you change a metric or dashboard chart, update `docs/metrics.md` and regenerate `docs/images/` (see [docs/contributing.md](docs/contributing.md)).
6. Open a pull request with the why, not only the what.

## Local commands

```bash
npm install
npm test
npm run dev
```

See [docs/contributing.md](docs/contributing.md) for coding notes and [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) for community expectations.
