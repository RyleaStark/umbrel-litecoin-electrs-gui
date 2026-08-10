import { describe, expect, it } from "vitest";
import { connectionDetailsSchema, createConnectionDetails } from "./connections.js";

describe("createConnectionDetails", () => {
  it("creates distinct Litecoin LAN and Tor connection records", () => {
    expect(createConnectionDetails({ localHost: "umbrel.local", torHost: "electrs.example.onion", port: "51001" })).toEqual({
      local: { address: "umbrel.local", port: 51001, connectionString: "umbrel.local:51001", transport: "tcp" },
      tor: { address: "electrs.example.onion", port: 51001, connectionString: "electrs.example.onion:51001", transport: "tcp" }
    });
  });

  it("rejects invalid public ports", () => {
    expect(() => createConnectionDetails({ localHost: "umbrel.local", torHost: "example.onion", port: "0" })).toThrow("Invalid Electrum port");
  });

  it("rejects connection payloads whose user-facing string is not exactly host:port", () => {
    const base = createConnectionDetails({ localHost: "umbrel.local", torHost: "example.onion", port: "51001" });
    expect(connectionDetailsSchema.safeParse({
      ...base,
      local: { ...base.local, connectionString: "umbrel.local:51002" },
    }).success).toBe(false);
    expect(connectionDetailsSchema.safeParse({
      ...base,
      tor: { ...base.tor, connectionString: "other.onion:51001" },
    }).success).toBe(false);
  });
});
