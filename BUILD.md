# Build

OpenVector is a single Node.js project: a TypeScript metric API and a Vite + React dashboard.

## Setup

```bash
npm install
```

## Development

```bash
npm run dev
```

- API: `http://127.0.0.1:3000`
- UI: `http://127.0.0.1:5173` (proxies `/api` to the API)

## Production-style run

```bash
npm run start
```

This builds the dashboard into `dist/` and serves it from the API process on port 3000.

Override the port with `PORT`.

## Tests

```bash
npm test
```

Metric calculations live in `src/metrics/` and must stay independent of React.

## Layout

```text
data/          Sample and user CSV files
config/        Optional YAML fallback
src/data/      CSV loader, schemas, validation
src/metrics/   Pure metric functions
src/api/       JSON assembly
src/server.ts  Express process
src/dashboard/ React UI
tests/         Vitest suites
```

## Configuration

`openvector.yaml` in the project root is preferred. If it is missing, `config/openvector.yaml` is used, then built-in defaults.
