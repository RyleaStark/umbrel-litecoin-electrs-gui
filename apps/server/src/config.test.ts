// @vitest-environment node
import { describe, expect, it } from "vitest";
import { readConfig } from "./config.js";

describe("server config", () => {
  it("reads the Umbrel Litecoin Electrs environment contract", () => {
    expect(readConfig({
      PORT: "3006",
      ELECTRS_HOST: "electrs_server_1",
      ELECTRS_PORT: "50001",
      ELECTRUM_PORT: "51001",
      ELECTRUM_LOCAL_SERVICE: "umbrel.local",
      ELECTRUM_HIDDEN_SERVICE: "example.onion",
      LITECOIN_HOST: "litecoin_core_1",
      RPC_PORT: "9332",
      RPC_USER: "gui",
      RPC_PASSWORD: "secret"
    })).toMatchObject({
      port: 3006,
      electrs: { host: "electrs_server_1", port: 50001 },
      connections: { localHost: "umbrel.local", torHost: "example.onion", port: 51001 },
      core: { host: "litecoin_core_1", port: 9332, username: "gui", password: "secret" }
    });
  });

  it("preserves non-secret legacy defaults while requiring the RPC password", () => {
    expect(readConfig({ RPC_PASSWORD: "secret" })).toMatchObject({
      port: 3006,
      electrs: { host: "0.0.0.0", port: 50002 },
      connections: { localHost: "umbrel.local", torHost: "/var/lib/tor/electrum/hostname", port: 51001 },
      core: { host: "172.28.0.2", port: 18443, username: "umbrel", password: "secret" }
    });
  });

  it("configures the bounded live Electrs progress receiver", () => {
    expect(readConfig({ RPC_PASSWORD: "secret" }).progress).toEqual({ host: "0.0.0.0", port: 5514 });
    expect(readConfig({
      RPC_PASSWORD: "secret",
      ELECTRS_PROGRESS_HOST: "127.0.0.1",
      ELECTRS_PROGRESS_PORT: "15514"
    }).progress).toEqual({ host: "127.0.0.1", port: 15514 });
  });

  it("uses Electrs' private monitoring listener for authoritative active phase classification", () => {
    expect(readConfig({ RPC_PASSWORD: "secret", ELECTRS_HOST: "electrs" }).metrics).toEqual({ host: "electrs", port: 4224 });
    expect(readConfig({
      RPC_PASSWORD: "secret",
      ELECTRS_HOST: "electrs",
      ELECTRS_MONITORING_HOST: "electrs-monitoring",
      ELECTRS_MONITORING_PORT: "14224"
    }).metrics).toEqual({ host: "electrs-monitoring", port: 14224 });
  });

  it("rejects missing credentials rather than shipping fallback secrets", () => {
    expect(() => readConfig({})).toThrow("Invalid Electrs GUI configuration");
  });
});
