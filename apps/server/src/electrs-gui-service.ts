import type { ConnectionDetails } from "../../../packages/contracts/src/connections.js";
import { deriveIndexerStatus, type IndexerStatus } from "../../../packages/contracts/src/status.js";
import type { ElectrsGuiService } from "./app.js";
import type { ElectrsProgress } from "./electrs-log-progress.js";

export interface LitecoinCoreClient {
  getBlockchainInfo(): Promise<{ blocks: number; initialblockdownload: boolean }>;
}

export interface ElectrsClient {
  getTip(): Promise<number>;
  getVersion(): Promise<string>;
}

function isInitialIndexingProgress(indexedHeight: number | null | undefined, coreHeight: number): indexedHeight is number {
  return indexedHeight !== null && indexedHeight !== undefined && indexedHeight < coreHeight;
}

export function createElectrsGuiService({
  core,
  electrs,
  progress,
  connections,
}: {
  core: LitecoinCoreClient;
  electrs: ElectrsClient;
  progress?: ElectrsProgress;
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
        const coreInfo = await core.getBlockchainInfo().catch(() => null);
        if (!coreInfo || coreInfo.initialblockdownload) return -2;
        const indexedHeight = await progress?.getIndexedHeight();
        if (isInitialIndexingProgress(indexedHeight, coreInfo.blocks)) {
          return (indexedHeight / coreInfo.blocks) * 100;
        }
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
        const indexedHeight = await progress?.getIndexedHeight() ?? null;
        return deriveIndexerStatus({
          coreHeight: coreInfo.blocks,
          indexedHeight: isInitialIndexingProgress(indexedHeight, coreInfo.blocks) ? indexedHeight : null,
          initialBlockDownload: false,
          version: null,
        });
      }
    },
  };
}
