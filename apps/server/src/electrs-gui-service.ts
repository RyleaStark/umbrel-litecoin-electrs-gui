import type { ConnectionDetails } from "../../../packages/contracts/src/connections.js";
import { deriveIndexerStatus, type IndexerStatus } from "../../../packages/contracts/src/status.js";
import type { ElectrsGuiService } from "./app.js";

export interface LitecoinCoreClient {
  getBlockchainInfo(): Promise<{ blocks: number; initialblockdownload: boolean }>;
}

export interface ElectrsClient {
  getTip(): Promise<number>;
  getVersion(): Promise<string>;
}

export function createElectrsGuiService({
  core,
  electrs,
  connections,
}: {
  core: LitecoinCoreClient;
  electrs: ElectrsClient;
  connections: ConnectionDetails;
}): ElectrsGuiService {
  return {
    getConnections: () => connections,
    getLegacyVersion: () => electrs.getVersion(),
    async getLegacySyncPercent() {
      try {
        const coreInfo = await core.getBlockchainInfo();
        if (coreInfo.initialblockdownload) return -1;
        await electrs.getVersion();
        const indexedHeight = await electrs.getTip();
        return (indexedHeight / coreInfo.blocks) * 100;
      } catch {
        return -2;
      }
    },
    async getStatus(): Promise<IndexerStatus> {
      let coreInfo: { blocks: number; initialblockdownload: boolean };
      try {
        coreInfo = await core.getBlockchainInfo();
      } catch {
        return {
          state: "degraded",
          version: null,
          coreHeight: null,
          indexedHeight: null,
          percent: null,
          message: "Litecoin Core is unavailable",
        };
      }

      if (coreInfo.initialblockdownload) {
        return deriveIndexerStatus({
          coreHeight: coreInfo.blocks,
          indexedHeight: null,
          initialBlockDownload: true,
          version: null,
        });
      }

      try {
        const [indexedHeight, version] = await Promise.all([
          electrs.getTip(),
          Promise.resolve().then(() => electrs.getVersion()).catch(() => null),
        ]);
        return deriveIndexerStatus({
          coreHeight: coreInfo.blocks,
          indexedHeight,
          initialBlockDownload: false,
          version,
        });
      } catch {
        return deriveIndexerStatus({
          coreHeight: coreInfo.blocks,
          indexedHeight: null,
          initialBlockDownload: false,
          version: null,
        });
      }
    },
  };
}
