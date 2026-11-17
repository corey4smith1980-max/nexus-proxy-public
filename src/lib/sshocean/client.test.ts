import { expect, test } from "bun:test";
import {
  fetchSshoceanProxiesByState,
  fixtureProxiesForState,
  parseSshoceanInventory,
  sshoceanConfigFromEnv,
  toCatalogProxy,
} from "./client";

const liveEnv = {
  SSHOCEAN_INVENTORY_MODE: "live",
  SSHOCEAN_API_KEY: "test-key",
  SSHOCEAN_API_SECRET: "test-secret",
  SSHOCEAN_API_BASE: "https://api.sshocean.com",
};

test("fixture inventory is state scoped and hides credentials in the catalog", () => {
  const proxies = fixtureProxiesForState("Texas");
  expect(proxies).toHaveLength(2);
  expect(proxies.every((proxy) => proxy.stateCode === "TX")).toBe(true);
  expect(proxies[0].host.startsWith("192.0.2.")).toBe(true);
  const catalog = toCatalogProxy(proxies[0]);
  expect(catalog.endpoint).not.toContain(proxies[0].password);
  expect(catalog.endpoint).toContain("***");
  expect(catalog.timeZone).toBe("America/Chicago");
  expect(JSON.stringify(catalog)).not.toContain("not-a-secret");
});

test("live mode drops rows from other states and skips incomplete rows", () => {
  const parsed = parseSshoceanInventory(
    {
      data: {
        proxies: [
          { id: "ny-1", ip: "203.0.113.10", port: "1080", username: "alpha", password: "secret", state: "New York", city: "New York", type: "residential" },
          { id: "ca-1", ip: "203.0.113.11", port: 1080, username: "beta", password: "secret", state: "CA" },
          { id: "ny-missing", ip: "203.0.113.12", port: 1080, state: "NY" },
          { id: "ny-sold", ip: "203.0.113.13", port: 1080, username: "gamma", password: "secret", state: "NY", status: "sold" },
        ],
      },
    },
    "NY",
  );
  expect(parsed.map((proxy) => proxy.externalId)).toEqual(["ny-1"]);
  expect(parsed[0].city).toBe("New York");
  expect(parsed[0].proxyType).toBe("residential");
});

test("live fetch sends the state filter and the bearer token", async () => {
  let requested = "";
  let authorization = "";
  let secret = "";
  const fetchImpl: typeof fetch = async (input, init) => {
    requested = String(input);
    const headers = new Headers(init?.headers);
    authorization = headers.get("Authorization") ?? "";
    secret = headers.get("X-Api-Secret") ?? "";
    return new Response(
      JSON.stringify({
        proxies: [{ id: "tx-9", host: "198.51.100.9", port: 1080, user: "pool", pass: "hidden-secret", region: "TX", city: "Houston" }],
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  };

  const inventory = await fetchSshoceanProxiesByState("tx", { env: liveEnv, fetchImpl });
  expect(requested).toBe("https://api.sshocean.com/v1/proxies?country=US&state=TX");
  expect(authorization).toBe("Bearer test-key");
  expect(secret).toBe("test-secret");
  expect(inventory.proxies).toHaveLength(1);
  expect(inventory.proxies[0].stateCode).toBe("TX");
  expect(inventory.proxies[0].username).toBe("pool");
});

test("fixture mode does not call the network", async () => {
  let called = false;
  const fetchImpl: typeof fetch = async () => {
    called = true;
    throw new Error("network should not be used");
  };
  const inventory = await fetchSshoceanProxiesByState("CA", {
    env: { SSHOCEAN_INVENTORY_MODE: "fixture" },
    fetchImpl,
  });
  expect(called).toBe(false);
  expect(inventory.mode).toBe("fixture");
  expect(inventory.proxies[0].stateCode).toBe("CA");
});

test("live mode without a key fails closed", () => {
  expect(() => sshoceanConfigFromEnv({})).toThrow(/SSHOCEAN_API_KEY/);
});
