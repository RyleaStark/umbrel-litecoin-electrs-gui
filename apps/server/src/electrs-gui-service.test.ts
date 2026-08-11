// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { createElectrsGuiService } from "./electrs-gui-service.js";

const connections = {
  local: { address: "umbrel.local", port: 51001, connectionString: "umbrel.local:51001", transport: "tcp" as const },
  tor: { address: "example.onion", port: 51001, connectionString: "example.onion:51001", transport: "tcp" as const }
};

describe("ElectrsGuiService", () => {
  it("waits for Litecoin Core without querying Electrs during IBD", async () => {
    const getElectrsTip = vi.fn();
    const service = createElectrsGuiService({
      core: { getBlockchainInfo: async () => ({ blocks: 80, initialblockdownload: true }) },
      electrs: { getTip: getElectrsTip, getVersion: vi.fn() },
      connections
    });

    expect(await service.getStatus()).toMatchObject({ state: "waiting-for-core", coreHeight: 80 });
    expect(await service.getLegacySyncPercent()).toBe(-1);
    expect(getElectrsTip).not.toHaveBeenCalled();
  });

  it("returns an accurate synchronized status", async () => {
    const service = createElectrsGuiService({
      core: { getBlockchainInfo: async () => ({ blocks: 110, initialblockdownload: false }) },
      electrs: { getTip: async () => 110, getVersion: async () => "0.9.12" },
      connections
    });

    expect(await service.getStatus()).toEqual({
      state: "ready",
      version: "0.9.12",
      coreHeight: 110,
      indexedHeight: 110,
      percent: 100,
      message: "Electrs is synchronized"
    });
    expect(service.getConnections()).toBe(connections);
    expect(await service.getLegacyVersion()).toBe("0.9.12");
    expect(await service.getLegacySyncPercent()).toBe(100);
  });

  it("degrades safely when Litecoin Core is unavailable", async () => {
    const service = createElectrsGuiService({
      core: { getBlockchainInfo: async () => { throw new Error("rpcuser:secret"); } },
      electrs: { getTip: vi.fn(), getVersion: vi.fn() },
      connections
    });

    expect(await service.getStatus()).toEqual({
      state: "degraded",
      version: null,
      coreHeight: null,
      indexedHeight: null,
      percent: null,
      message: "Litecoin Core is unavailable"
    });
  });

  it("reports connecting when Core is ready but Electrs is not", async () => {
    const service = createElectrsGuiService({
      core: { getBlockchainInfo: async () => ({ blocks: 110, initialblockdownload: false }) },
      electrs: { getTip: async () => { throw new Error("not ready"); }, getVersion: vi.fn() },
      connections
    });

    expect(await service.getStatus()).toMatchObject({
      state: "connecting",
      coreHeight: 110,
      indexedHeight: null,
      percent: null
    });
    expect(await service.getLegacySyncPercent()).toBe(-2);
  });

  it("reports real provider progress while the Electrs listener is closed for initial indexing", async () => {
    const service = createElectrsGuiService({
      core: { getBlockchainInfo: async () => ({ blocks: 3_157_425, initialblockdownload: false }) },
      electrs: { getTip: async () => { throw new Error("listener closed during indexing"); }, getVersion: vi.fn() },
      progress: { getIndexedHeight: async () => 87_000 },
      connections
    });

    expect(await service.getStatus()).toEqual({
      state: "indexing",
      version: null,
      coreHeight: 3_157_425,
      indexedHeight: 87_000,
      percent: 2.76,
      message: "Indexing Litecoin blocks"
    });
    await expect(service.getLegacySyncPercent()).resolves.toBeCloseTo(2.7554, 4);
  });

  it("reports Electrs' active transaction-index phase from the exact live metrics shape instead of Connecting", async () => {
    const service = createElectrsGuiService({
      core: { getBlockchainInfo: async () => ({ blocks: 3_157_834, initialblockdownload: false }) },
      electrs: { getTip: async () => { throw new Error("listener closed during initial update"); }, getVersion: vi.fn() },
      metrics: { getInitialIndexPhase: async () => ({ phase: "transactions" as const, tipHeight: 0 }) },
      connections
    });

    expect(await service.getStatus()).toEqual({
      state: "indexing",
      version: null,
      coreHeight: 3_157_834,
      indexedHeight: null,
      percent: null,
      message: "Building Electrs transaction index"
    });
    await expect(service.getLegacySyncPercent()).resolves.toBe(-2);
  });

  it("distinguishes Electrs' own history-index phase from transaction indexing", async () => {
    const service = createElectrsGuiService({
      core: { getBlockchainInfo: async () => ({ blocks: 3_157_834, initialblockdownload: false }) },
      electrs: { getTip: async () => { throw new Error("listener closed during initial update"); }, getVersion: vi.fn() },
      metrics: { getInitialIndexPhase: async () => ({ phase: "history" as const, tipHeight: 0 }) },
      connections
    });

    expect(await service.getStatus()).toMatchObject({
      state: "indexing",
      indexedHeight: null,
      percent: null,
      message: "Building Electrs history index"
    });
  });

  it.each([
    ["equal to", 110],
    ["ahead of", 111],
  ])("never infers readiness from provider progress %s Core when the listener is unavailable", async (_label, indexedHeight) => {
    const service = createElectrsGuiService({
      core: { getBlockchainInfo: async () => ({ blocks: 110, initialblockdownload: false }) },
      electrs: { getTip: async () => { throw new Error("listener unavailable"); }, getVersion: vi.fn() },
      progress: { getIndexedHeight: async () => indexedHeight },
      connections
    });

    expect(await service.getStatus()).toMatchObject({ state: "connecting", indexedHeight: null, percent: null });
    expect(await service.getLegacySyncPercent()).toBe(-2);
  });

  it.each([
    ["equal to", 110],
    ["ahead of", 111],
  ])("never infers readiness from metrics tip %s Core while the provider listener is unavailable", async (_label, tipHeight) => {
    const service = createElectrsGuiService({
      core: { getBlockchainInfo: async () => ({ blocks: 110, initialblockdownload: false }) },
      electrs: { getTip: async () => { throw new Error("listener unavailable"); }, getVersion: vi.fn() },
      metrics: { getInitialIndexPhase: async () => ({ phase: "history", tipHeight }) },
      connections
    });

    expect(await service.getStatus()).toMatchObject({ state: "connecting", indexedHeight: null, percent: null });
  });

  it("preserves the legacy unclamped synchronization percentage", async () => {
    const service = createElectrsGuiService({
      core: { getBlockchainInfo: async () => ({ blocks: 100, initialblockdownload: false }) },
      electrs: { getTip: async () => 110, getVersion: async () => "0.9.12" },
      connections
    });

    expect(await service.getLegacySyncPercent()).toBeCloseTo(110);
  });
});
