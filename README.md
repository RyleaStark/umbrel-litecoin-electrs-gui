# Electrs (LTC) for Umbrel

A modern, Litecoin-aware Electrs status and wallet-connection interface for Umbrel.

This GUI is paired with [`RyleaStark/umbrel-electrs-ltc`](https://github.com/RyleaStark/umbrel-electrs-ltc), an actual Electrs implementation built against Litecoin's chain parameters. It remains independent from the Fulcrum (LTC) and ElectrumX (LTC) products.

## Interface

- React 19, TypeScript 6, Vite 8, Tailwind CSS 4, and Fastify 5;
- current Umbrel Bitcoin Node/Litecoin Node visual conventions;
- explicit waiting, connecting, indexing, synchronized, and degraded states;
- accessible local and Tor connection details, clipboard controls, and locally generated QR codes;
- no telemetry and no logging of request paths, RPC payloads, wallet addresses, or daemon responses;
- compatibility routes retained for existing Umbrel health and integration checks.

## Runtime contract

The Umbrel package supplies:

- `PORT` for the GUI service, normally `3006`;
- `ELECTRS_HOST` and `ELECTRS_PORT` for the private Electrs Electrum TCP service;
- `LITECOIN_HOST`, `RPC_PORT`, `RPC_USER`, and `RPC_PASSWORD` for scoped Litecoin Core access;
- `ELECTRUM_PORT`, `ELECTRUM_LOCAL_SERVICE`, and `ELECTRUM_HIDDEN_SERVICE` for wallet connection instructions.

Non-secret variables retain the inherited defaults for compatibility, except the Litecoin suite's wallet-facing default is fixed at `51001`. `RPC_PASSWORD` is intentionally required; the inherited fallback credential was removed.

The backend uses Node's native HTTP and TCP clients. It requests only `getblockchaininfo`, `server.version`, and `blockchain.headers.subscribe` and returns validated, minimal public responses.

## Development

Requires Node.js 24 LTS and npm 12.0.2.

```bash
npm ci
npm run lint
npm run typecheck
npm test
npm run build
```

For local regtest integration:

```bash
docker compose up --build
```

## Container

```bash
docker build -t umbrel-litecoin-electrs-gui .
```

The production image:

- uses digest-pinned Node 24 build and Distroless Node 24 Debian 13 runtime images;
- installs only production dependencies;
- runs as UID/GID `1000:1000`;
- includes no frontend build toolchain;
- exposes only port `3006`.

Tagged `v*` releases publish multi-architecture images to `ghcr.io/ryleastark/umbrel-litecoin-electrs-gui` after audit, lint, typecheck, tests, and production build pass.

## License

This repository retains its inherited PolyForm Noncommercial License 1.0.0. See [`LICENSE.md`](LICENSE.md) and [`LICENSE.legacy`](LICENSE.legacy). Bundled font notices are preserved in [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md).
