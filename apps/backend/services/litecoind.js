const camelizeKeys = require("camelize-keys");
const RpcClient = require("bitcoind-rpc");

const LitecoindError = require("models/errors.js").LitecoindError;

const LITECOIND_RPC_PORT = process.env.RPC_PORT || 18443; // eslint-disable-line no-magic-numbers, max-len
const LITECOIND_HOST = process.env.LITECOIN_HOST || "172.28.0.2";
const LITECOIND_RPC_USER = process.env.RPC_USER || "umbrel";
const LITECOIND_RPC_PASSWORD =
  process.env.RPC_PASSWORD || "7-9j7pEXcV2s4cM_3JKfk-30eEmei94PRmUaDpHId-s=";

const rpcClient = new RpcClient({
  protocol: "http",
  user: LITECOIND_RPC_USER, // eslint-disable-line object-shorthand
  pass: LITECOIND_RPC_PASSWORD, // eslint-disable-line object-shorthand
  host: LITECOIND_HOST,
  port: LITECOIND_RPC_PORT
});

function promiseify(rpcObj, rpcFn, what) {
  return new Promise((resolve, reject) => {
    try {
      rpcFn.call(rpcObj, (err, info) => {
        if (err) {
          reject(new LitecoindError(`Unable to obtain ${what}`, err));
        } else {
          resolve(camelizeKeys(info, "_"));
        }
      });
    } catch (error) {
      reject(error);
    }
  });
}

function getBlockChainInfo() {
  return promiseify(rpcClient, rpcClient.getBlockchainInfo, "blockchain info");
}

module.exports = {
  getBlockChainInfo
};
