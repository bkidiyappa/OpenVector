# Security

OpenVector is designed to process engineering data locally. CSV files never leave the machine unless you deploy the process yourself.

## Supported versions

The current `main` branch is the only supported line until a numbered release is published.

## Reporting a vulnerability

Please **do not** open a public issue for security problems.

Use GitHub’s private vulnerability reporting on this repository, or email the maintainers listed on the GitHub org profile. Include:

- A description of the issue
- Steps to reproduce
- Impact (for example: path traversal when reading `data.path`, XSS in dashboard fields)

You should receive an acknowledgement within 14 days.

## Deployment notes

- Treat `./data` as sensitive. Do not commit production CSVs.
- `data.path` is resolved from the working directory. Do not point it at untrusted locations if the process is exposed beyond localhost.
- V1 is intended for local use. If you put it on a network, add your own authentication.
