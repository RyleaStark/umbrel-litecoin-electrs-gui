# Electrs (LTC) for Umbrel

A Litecoin-aware fork of Umbrel's official Electrs status and connection GUI.

This GUI is paired with [`RyleaStark/umbrel-electrs-ltc`](https://github.com/RyleaStark/umbrel-electrs-ltc), an actual Electrs implementation built against Litecoin's chain parameters. It is intentionally independent from the Fulcrum (LTC) app and runtime.

## Runtime contract

The Umbrel package supplies:

- `ELECTRS_HOST` and `ELECTRS_PORT` for the Electrs Electrum TCP service;
- `LITECOIN_HOST`, `RPC_PORT`, `RPC_USER`, and `RPC_PASSWORD` for Litecoin Core;
- `ELECTRUM_LOCAL_SERVICE` and `ELECTRUM_HIDDEN_SERVICE` for wallet connection instructions.

The `bitcoind-rpc` npm dependency is retained only as a protocol-compatible JSON-RPC client library. The configured daemon is Litecoin Core and all user-facing terminology is Litecoin-specific.

## Build

```bash
docker build -t umbrel-litecoin-electrs-gui .
```

Tagged `v*` releases publish multi-architecture images to `ghcr.io/ryleastark/umbrel-litecoin-electrs-gui`.

## License

MIT
