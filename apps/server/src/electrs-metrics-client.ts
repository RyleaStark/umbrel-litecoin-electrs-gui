export type ElectrsInitialIndexPhase = "transactions" | "history";

export interface ElectrsMetricsClient {
  getInitialIndexPhase(): Promise<{ phase: ElectrsInitialIndexPhase; tipHeight: number }>;
}

const metricPattern = /^([a-z_]+)(?:\{step="([a-z_]+)"\})?\s+([0-9]+(?:\.[0-9]+)?)$/;

export function createElectrsMetricsClient({
  host,
  port,
  fetchFn = fetch,
  timeoutMs = 5_000,
}: {
  host: string;
  port: number;
  fetchFn?: typeof fetch;
  timeoutMs?: number;
}): ElectrsMetricsClient {
  return {
    async getInitialIndexPhase() {
      let response: Response;
      try {
        response = await fetchFn(`http://${host}:${port}/`, {
          redirect: "error",
          signal: AbortSignal.timeout(timeoutMs),
        });
      } catch {
        throw new Error("Electrs metrics request failed");
      }
      if (!response.ok) throw new Error("Electrs metrics request failed");

      const values = new Map<string, number>();
      for (const line of (await response.text()).split(/\r?\n/)) {
        const match = metricPattern.exec(line);
        if (!match) continue;
        const metric = match[1];
        const rawValue = match[3];
        if (!metric || !rawValue) continue;
        const key = match[2] ? `${metric}:${match[2]}` : metric;
        if (values.has(key)) throw new Error("Electrs metrics response was invalid");
        const value = Number(rawValue);
        if (!Number.isSafeInteger(value) || value < 0) throw new Error("Electrs metrics response was invalid");
        values.set(key, value);
      }

      const tipHeight = values.get("tip_height");
      const transactionUpdates = values.get("index_duration_count:add_process") ?? 0;
      const historyUpdates = values.get("index_duration_count:index_process") ?? 0;
      if (tipHeight === undefined || (transactionUpdates === 0 && historyUpdates === 0)) {
        throw new Error("Electrs metrics response was invalid");
      }
      return {
        phase: historyUpdates > 0 ? "history" : "transactions",
        tipHeight,
      };
    },
  };
}
