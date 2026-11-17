import { expect, test } from "bun:test";
import { fixtureExternalId } from "./client";
import { syncSshoceanStateInventory, type ProxyDb, type ProxyRowSnapshot } from "./sync";

test("sync upserts available SSHOcean rows and leaves leased rows alone", async () => {
  const writes: Record<string, unknown>[][] = [];
  const existing: ProxyRowSnapshot[] = [
    {
      external_id: fixtureExternalId("TX", "a"),
      ip: "192.0.2.10",
      port: 1080,
      username: "fixture",
      status: "leased",
    },
  ];
  const db: ProxyDb = {
    from() {
      return {
        select() {
          return {
            eq() {
              return {
                eq: async () => ({ data: existing, error: null }),
              };
            },
          };
        },
        upsert: async (rows) => {
          writes.push(rows);
          return { error: null };
        },
      };
    },
  };

  const result = await syncSshoceanStateInventory(db, "Texas", {
    env: { SSHOCEAN_INVENTORY_MODE: "fixture" },
  });

  expect(result.stateCode).toBe("TX");
  expect(result.mode).toBe("fixture");
  expect(result.skipped).toBe(1);
  expect(result.upserted).toBe(1);
  expect(writes).toHaveLength(1);
  expect(writes[0][0]?.region).toBe("TX");
  expect(writes[0][0]?.source).toBe("sshocean");
  expect(writes[0][0]?.country).toBe("US");
  expect(writes[0][0]?.external_id).toBe(fixtureExternalId("TX", "b"));
});
