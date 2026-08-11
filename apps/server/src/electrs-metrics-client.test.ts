// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { createElectrsMetricsClient } from "./electrs-metrics-client.js";

const liveTransactionPhaseFixture = [
  "# HELP index_duration Index update duration (in seconds)",
  "# TYPE index_duration histogram",
  'index_duration_count{step="add_process"} 4513',
  'index_duration_count{step="add_write"} 4513',
  "# HELP tip_height Current chain tip height",
  "# TYPE tip_height gauge",
  "tip_height 0",
  "",
].join("\n");

describe("ElectrsMetricsClient", () => {
  it("classifies the exact sanitized live metrics shape as Electrs transaction indexing", async () => {
    const fetchFn = vi.fn(async () => new Response(liveTransactionPhaseFixture));
    const client = createElectrsMetricsClient({ host: "electrs", port: 4224, fetchFn });

    await expect(client.getInitialIndexPhase()).resolves.toEqual({ phase: "transactions", tipHeight: 0 });
    expect(fetchFn).toHaveBeenCalledWith("http://electrs:4224/", expect.objectContaining({ redirect: "error" }));
  });

  it("classifies history only after a provider history-index step exists", async () => {
    const body = `${liveTransactionPhaseFixture}index_duration_count{step="index_process"} 1\n`;
    const client = createElectrsMetricsClient({ host: "electrs", port: 4224, fetchFn: async () => new Response(body) });

    await expect(client.getInitialIndexPhase()).resolves.toEqual({ phase: "history", tipHeight: 0 });
  });

  it.each([
    ["missing provider tip", 'index_duration_count{step="add_process"} 1\n'],
    ["no provider index work", "tip_height 0\n"],
    ["malformed provider value", 'index_duration_count{step="add_process"} NaN\ntip_height 0\n'],
  ])("fails closed for %s", async (_label, body) => {
    const client = createElectrsMetricsClient({ host: "electrs", port: 4224, fetchFn: async () => new Response(body) });
    await expect(client.getInitialIndexPhase()).rejects.toThrow("Electrs metrics response was invalid");
  });
});
