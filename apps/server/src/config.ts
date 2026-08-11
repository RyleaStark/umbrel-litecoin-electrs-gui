import { z } from "zod";

const port = z.coerce.number().int().min(1).max(65535);
const nonempty = z.string().trim().min(1);

const environmentSchema = z.object({
  PORT: port.default(3006),
  ELECTRS_HOST: nonempty.default("0.0.0.0"),
  ELECTRS_PORT: port.default(50002),
  ELECTRS_PROGRESS_HOST: nonempty.default("0.0.0.0"),
  ELECTRS_PROGRESS_PORT: port.default(5514),
  ELECTRS_MONITORING_HOST: nonempty.optional(),
  ELECTRS_MONITORING_PORT: port.default(4224),
  ELECTRUM_PORT: port.default(51001),
  ELECTRUM_LOCAL_SERVICE: nonempty.default("umbrel.local"),
  ELECTRUM_HIDDEN_SERVICE: nonempty.default("/var/lib/tor/electrum/hostname"),
  LITECOIN_HOST: nonempty.default("172.28.0.2"),
  RPC_PORT: port.default(18443),
  RPC_USER: nonempty.default("umbrel"),
  RPC_PASSWORD: nonempty,
});

export type ServerConfig = ReturnType<typeof readConfig>;

export function readConfig(environment: NodeJS.ProcessEnv | Record<string, string | undefined>) {
  const parsed = environmentSchema.safeParse(environment);
  if (!parsed.success) {
    throw new Error("Invalid Electrs GUI configuration");
  }

  return {
    port: parsed.data.PORT,
    electrs: { host: parsed.data.ELECTRS_HOST, port: parsed.data.ELECTRS_PORT },
    progress: { host: parsed.data.ELECTRS_PROGRESS_HOST, port: parsed.data.ELECTRS_PROGRESS_PORT },
    metrics: {
      host: parsed.data.ELECTRS_MONITORING_HOST ?? parsed.data.ELECTRS_HOST,
      port: parsed.data.ELECTRS_MONITORING_PORT,
    },
    connections: {
      localHost: parsed.data.ELECTRUM_LOCAL_SERVICE,
      torHost: parsed.data.ELECTRUM_HIDDEN_SERVICE,
      port: parsed.data.ELECTRUM_PORT,
    },
    core: {
      host: parsed.data.LITECOIN_HOST,
      port: parsed.data.RPC_PORT,
      username: parsed.data.RPC_USER,
      password: parsed.data.RPC_PASSWORD,
    },
  };
}
