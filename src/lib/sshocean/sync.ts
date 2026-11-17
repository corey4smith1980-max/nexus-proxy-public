/**
 * Pull SSHOcean inventory for one US state into the `proxies` table.
 * The provisioning worker calls this before it reserves a proxy for an order.
 * Rows that are already leased are left alone.
 */

import { requireUsStateCode } from "../geo/us-states";
import { fetchSshoceanProxiesByState, type SshoceanProxy } from "./client";

export type ProxyRowSnapshot = {
  external_id: string | null;
  ip: unknown;
  port: number;
  username: string;
  status: string | null;
};

export type ProxyDb = {
  from: (table: string) => {
    select: (columns: string) => {
      eq: (column: string, value: string) => {
        eq: (column: string, value: string) => Promise<{
          data: ProxyRowSnapshot[] | null;
          error: { message: string } | null;
        }>;
      };
    };
    upsert: (
      rows: Record<string, unknown>[],
      options: { onConflict: string },
    ) => Promise<{ error: { message: string } | null }>;
  };
};

export type SyncResult = {
  stateCode: string;
  upserted: number;
  skipped: number;
  mode: "live" | "fixture";
};

export async function syncSshoceanStateInventory(
  db: ProxyDb,
  stateInput: string,
  options: { env?: Record<string, string | undefined>; fetchImpl?: typeof fetch } = {},
): Promise<SyncResult> {
  const stateCode = requireUsStateCode(stateInput);
  const inventory = await fetchSshoceanProxiesByState(stateCode, options);

  const { data: existing, error: readError } = await db
    .from("proxies")
    .select("external_id, ip, port, username, status")
    .eq("source", "sshocean")
    .eq("region", stateCode);

  if (readError) {
    throw new Error(`Failed to read SSHOcean inventory for ${stateCode}: ${readError.message}`);
  }

  const reservedKeys = new Set<string>();
  for (const row of existing ?? []) {
    if ((row.status ?? "available") === "available") continue;
    if (row.external_id) reservedKeys.add(`id:${row.external_id}`);
    reservedKeys.add(`proxy:${String(row.ip)}|${row.port}|${row.username}`);
  }

  const toWrite: Record<string, unknown>[] = [];
  let skipped = 0;
  for (const proxy of inventory.proxies) {
    if (isReserved(proxy, reservedKeys)) {
      skipped += 1;
      continue;
    }
    toWrite.push(toProxyInsert(proxy));
  }

  if (toWrite.length > 0) {
    const { error: writeError } = await db.from("proxies").upsert(toWrite, { onConflict: "ip,port,username" });
    if (writeError) {
      throw new Error(`Failed to upsert SSHOcean proxies for ${stateCode}: ${writeError.message}`);
    }
  }

  return {
    stateCode,
    upserted: toWrite.length,
    skipped,
    mode: inventory.mode,
  };
}

function isReserved(proxy: SshoceanProxy, reservedKeys: Set<string>): boolean {
  return reservedKeys.has(`id:${proxy.externalId}`) || reservedKeys.has(`proxy:${proxy.host}|${proxy.port}|${proxy.username}`);
}

function toProxyInsert(proxy: SshoceanProxy): Record<string, unknown> {
  return {
    ip: proxy.host,
    port: proxy.port,
    username: proxy.username,
    password: proxy.password,
    proxy_type: proxy.proxyType,
    protocol: proxy.protocol,
    auth_type: "userpass",
    country: "US",
    region: proxy.stateCode,
    city: proxy.city,
    host: proxy.host,
    status: "available",
    source: "sshocean",
    external_id: proxy.externalId,
    blacklist: false,
    last_seen_at: new Date().toISOString(),
    provisioned_from: "sshocean",
  };
}
