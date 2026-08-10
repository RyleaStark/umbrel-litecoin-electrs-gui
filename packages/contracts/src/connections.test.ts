import { describe, expect, it } from "vitest";
import { createConnectionDetails } from "./connections.js";

describe("createConnectionDetails", () => {
  it("creates distinct Litecoin LAN and Tor connection records", () => {
    expect(createConnectionDetails({ localHost: "umbrel.local", torHost: "electrs.example.onion", port: "51001" })).toEqual({
      local: { address: "umbrel.local", port: 51001, connectionString: "umbrel.local:51001:t", transport: "tcp" },
      tor: { address: "electrs.example.onion", port: 51001, connectionString: "electrs.example.onion:51001:t", transport: "tcp" }
    });
  });

  it("rejects invalid public ports", () => {
    expect(() => createConnectionDetails({ localHost: "umbrel.local", torHost: "example.onion", port: "0" })).toThrow("Invalid Electrum port");
  });
});
