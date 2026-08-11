// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { createFulcrumGuiService } from "./fulcrum-gui-service.js";

const connections = {
  local: { address: "umbrel.local", port: 50002, connectionString: "umbrel.local:50002", transport: "tcp" as const },
  tor: { address: "example.onion", port: 50002, connectionString: "example.onion:50002", transport: "tcp" as const }
};

const readyCore = (blocks: number, initialblockdownload = false) => ({
  getBlockchainInfo: async () => ({ blocks, initialblockdownload }),
  getTxIndexInfo: async () => ({ synced: true, bestBlockHeight: blocks }),
});

describe("FulcrumGuiService", () => {
  it("waits for Bitcoin Core without querying Fulcrum during IBD", async () => {
    const getTip = vi.fn();
    const service = createFulcrumGuiService({ core: readyCore(80, true), fulcrum: { getTip, getVersion: vi.fn() }, connections });
    expect(await service.getStatus()).toMatchObject({ state: "waiting-for-core", coreHeight: 80 });
    expect(await service.getLegacySyncPercent()).toBe(0);
    expect(getTip).not.toHaveBeenCalled();
  });


  it("uses a successful Fulcrum listener response as authoritative readiness", async () => {
    const service = createFulcrumGuiService({ core: readyCore(110), fulcrum: { getTip: async () => 110, getVersion: async () => "2.1.1" }, connections });
    expect(await service.getStatus()).toEqual({ state: "ready", version: "2.1.1", coreHeight: 110, indexedHeight: 110, percent: 100, message: "Fulcrum is synchronized" });
    expect(await service.getLegacySyncPercent()).toBe(100);
  });

  it("keeps Fulcrum readiness separate from its required Core transaction-index prerequisite", async () => {
    const getTip = vi.fn();
    const getVersion = vi.fn();
    const service = createFulcrumGuiService({
      core: {
        getBlockchainInfo: async () => ({ blocks: 110, initialblockdownload: false }),
        getTxIndexInfo: async () => ({ synced: false, bestBlockHeight: 90 }),
      },
      fulcrum: { getTip, getVersion },
      connections,
    });
    expect(await service.getStatus()).toMatchObject({
      state: "waiting-for-core",
      message: "Waiting for Bitcoin Core transaction index",
      indexedHeight: null,
    });
    expect(getTip).not.toHaveBeenCalled();
    expect(getVersion).not.toHaveBeenCalled();
  });

  it("degrades safely when Bitcoin Core is unavailable", async () => {
    const service = createFulcrumGuiService({ core: { getBlockchainInfo: async () => { throw new Error("secret"); }, getTxIndexInfo: vi.fn() }, fulcrum: { getTip: vi.fn(), getVersion: vi.fn() }, connections });
    expect(await service.getStatus()).toMatchObject({ state: "degraded", message: "Bitcoin Core is unavailable" });
  });

  it("reports Fulcrum-owned transaction-history indexing while listeners are unavailable", async () => {
    const service = createFulcrumGuiService({
      core: readyCore(3_157_425),
      fulcrum: { getTip: async () => { throw new Error("listener closed"); }, getVersion: vi.fn() },
      progress: { getProgress: async () => ({ indexedHeight: 87_000, targetHeight: 3_157_425, phase: "DownloadingBlocks" }) },
      connections,
    });
    expect(await service.getStatus()).toEqual({ state: "indexing", version: null, coreHeight: 3_157_425, indexedHeight: 87_000, percent: 2.76, message: "Indexing Fulcrum transaction history" });
    await expect(service.getLegacySyncPercent()).resolves.toBeCloseTo(2.7554, 4);
  });

  it("does not collapse malformed or unavailable provider stats into fabricated progress", async () => {
    const service = createFulcrumGuiService({
      core: readyCore(110),
      fulcrum: { getTip: async () => { throw new Error("not ready"); }, getVersion: vi.fn() },
      progress: { getProgress: async () => { throw new Error("invalid stats"); } },
      connections,
    });
    expect(await service.getStatus()).toMatchObject({ state: "connecting", indexedHeight: null, percent: null });
  });

  it.each([["equal to", 110], ["ahead of", 111]])("never infers readiness from provider stats %s Core", async (_label, indexedHeight) => {
    const service = createFulcrumGuiService({
      core: readyCore(110),
      fulcrum: { getTip: async () => { throw new Error("listener unavailable"); }, getVersion: vi.fn() },
      progress: { getProgress: async () => ({ indexedHeight, targetHeight: 110, phase: "End" }) },
      connections,
    });
    expect(await service.getStatus()).toMatchObject({ state: "connecting", indexedHeight: null, percent: null });
  });

  it("never infers readiness when provider stats target a newer tip than the Core snapshot", async () => {
    const service = createFulcrumGuiService({
      core: readyCore(110),
      fulcrum: { getTip: async () => { throw new Error("listener unavailable"); }, getVersion: vi.fn() },
      progress: { getProgress: async () => ({ indexedHeight: 110, targetHeight: 111, phase: "DownloadingBlocks" }) },
      connections,
    });
    expect(await service.getStatus()).toMatchObject({ state: "connecting", indexedHeight: null, percent: null });
  });

  it("reports degradation after an authoritative ready listener disappears", async () => {
    const getTip = vi.fn().mockResolvedValueOnce(110).mockRejectedValueOnce(new Error("down"));
    const service = createFulcrumGuiService({
      core: readyCore(110),
      fulcrum: { getTip, getVersion: async () => "2.1.1" },
      progress: { getProgress: async () => ({ indexedHeight: 110, targetHeight: 110, phase: "End" }) },
      connections,
    });
    await expect(service.getStatus()).resolves.toMatchObject({ state: "ready" });
    await expect(service.getStatus()).resolves.toMatchObject({ state: "degraded", message: "Fulcrum is unavailable" });
  });
});
