/**
 * SSHOcean inventory, filtered by US state.
 *
 * Live mode calls:
 *   GET {SSHOCEAN_API_BASE}/v1/proxies?country=US&state={USPS}
 *   Authorization: Bearer {SSHOCEAN_API_KEY}
 *   X-Api-Secret: {SSHOCEAN_API_SECRET}   (only when the secret is set)
 *
 * The response may be `{ proxies: [...] }`, `{ data: [...] }`, `{ results: [...] }`,
 * or a bare array. Each row needs a host (or ip), port, username, and password.
 * State may be a USPS code or a state name. Rows for other states are dropped.
 *
 * Credentials stay on the server. `toCatalogProxy` is what the customer UI receives.
 *
 * Fixture mode (`SSHOCEAN_INVENTORY_MODE=fixture`) returns documentation-range
 * addresses (192.0.2.0/24) and the password "not-a-secret". It does not call
 * the network. Do not use it in production.
 */

import { findUsState, requireUsStateCode, type UsState } from "../geo/us-states";

export type SshoceanMode = "live" | "fixture";

export type SshoceanProxy = {
  externalId: string;
  host: string;
  port: number;
  username: string;
  password: string;
  protocol: string;
  proxyType: string;
  country: "US";
  stateCode: string;
  city: string | null;
  status: string;
  priceCents: number | null;
};

export type SshoceanCatalogProxy = {
  externalId: string;
  endpoint: string;
  stateCode: string;
  stateName: string;
  city: string | null;
  proxyType: string;
  protocol: string;
  status: string;
  priceCents: number | null;
  timeZone: string;
};

export type SshoceanInventory = {
  mode: SshoceanMode;
  stateCode: string;
  proxies: SshoceanProxy[];
};

export class SshoceanError extends Error {
  readonly code: "config" | "http" | "parse" | "state";

  constructor(message: string, code: SshoceanError["code"]) {
    super(message);
    this.name = "SshoceanError";
    this.code = code;
  }
}

export type SshoceanConfig = {
  mode: SshoceanMode;
  baseUrl: string;
  apiKey?: string;
  apiSecret?: string;
};

const DEFAULT_BASE_URL = "https://api.sshocean.com";
const UNAVAILABLE = new Set(["offline", "sold", "leased", "unavailable", "disabled", "expired"]);

export function sshoceanConfigFromEnv(env: Record<string, string | undefined> = process.env): SshoceanConfig {
  const requested = (env.SSHOCEAN_INVENTORY_MODE ?? "").trim().toLowerCase();
  const apiKey = env.SSHOCEAN_API_KEY?.trim() || undefined;
  const apiSecret = env.SSHOCEAN_API_SECRET?.trim() || undefined;
  const baseUrl = (env.SSHOCEAN_API_BASE?.trim() || DEFAULT_BASE_URL).replace(/\/$/, "");

  if (requested === "fixture") {
    return { mode: "fixture", baseUrl, apiKey, apiSecret };
  }
  if (requested && requested !== "live") {
    throw new SshoceanError(`SSHOCEAN_INVENTORY_MODE must be "live" or "fixture" (got "${requested}").`, "config");
  }
  if (!apiKey) {
    throw new SshoceanError(
      "SSHOcean is not configured. Set SSHOCEAN_API_KEY for live inventory, or SSHOCEAN_INVENTORY_MODE=fixture for local sample rows.",
      "config",
    );
  }
  return { mode: "live", baseUrl, apiKey, apiSecret };
}

export function fixtureExternalId(stateCode: string, slot: "a" | "b"): string {
  return `sshocean-fixture-${stateCode}-${slot}`;
}

export function fixtureProxiesForState(stateInput: string): SshoceanProxy[] {
  const state = findUsState(stateInput);
  if (!state) {
    throw new SshoceanError(`No fixture inventory for "${stateInput}".`, "state");
  }
  return [
    fixtureRow(state, "a", "residential", 199),
    fixtureRow(state, "b", "datacenter", 349),
  ];
}

function fixtureRow(state: UsState, slot: "a" | "b", proxyType: string, priceCents: number): SshoceanProxy {
  const offset = (state.code.charCodeAt(0) + state.code.charCodeAt(1) + (slot === "a" ? 1 : 40)) % 200;
  return {
    externalId: fixtureExternalId(state.code, slot),
    host: `192.0.2.${offset + 10}`,
    port: slot === "a" ? 1080 : 1081,
    username: "fixture",
    password: "not-a-secret",
    protocol: "socks5",
    proxyType,
    country: "US",
    stateCode: state.code,
    city: state.sampleCity,
    status: "available",
    priceCents,
  };
}

export function maskHost(host: string): string {
  const parts = host.split(".");
  if (parts.length === 4 && parts.every((part) => /^\d{1,3}$/.test(part))) {
    return `${parts[0]}.***.***.***`;
  }
  const labels = host.split(".");
  if (labels.length < 2) return "hidden";
  return `${labels[0].slice(0, 2)}***.${labels.slice(1).join(".")}`;
}

export function toCatalogProxy(proxy: SshoceanProxy): SshoceanCatalogProxy {
  const state = findUsState(proxy.stateCode);
  return {
    externalId: proxy.externalId,
    endpoint: `${maskHost(proxy.host)}:${proxy.port}`,
    stateCode: proxy.stateCode,
    stateName: state?.name ?? proxy.stateCode,
    city: proxy.city,
    proxyType: proxy.proxyType,
    protocol: proxy.protocol,
    status: proxy.status,
    priceCents: proxy.priceCents,
    timeZone: state?.timeZone ?? "UTC",
  };
}

export function parseSshoceanInventory(payload: unknown, stateInput: string): SshoceanProxy[] {
  const state = findUsState(stateInput);
  if (!state) {
    throw new SshoceanError(`"${stateInput}" is not a US state.`, "state");
  }
  const rows = extractRows(payload);
  const proxies: SshoceanProxy[] = [];
  for (const row of rows) {
    const parsed = parseRow(row, state.code);
    if (parsed) proxies.push(parsed);
  }
  return proxies;
}

function extractRows(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") {
    throw new SshoceanError("SSHOcean returned a payload that is not a proxy list.", "parse");
  }
  const record = payload as Record<string, unknown>;
  for (const key of ["proxies", "data", "results", "items", "inventory"]) {
    const value = record[key];
    if (Array.isArray(value)) return value;
    if (value && typeof value === "object") {
      const nested = value as Record<string, unknown>;
      for (const inner of ["proxies", "items", "results"]) {
        if (Array.isArray(nested[inner])) return nested[inner] as unknown[];
      }
    }
  }
  throw new SshoceanError("SSHOcean response did not include a proxy list.", "parse");
}

function parseRow(row: unknown, requestedState: string): SshoceanProxy | null {
  if (!row || typeof row !== "object") return null;
  const record = row as Record<string, unknown>;
  const stateValue = firstString(record, ["state", "state_code", "stateCode", "region"]);
  if (stateValue) {
    const parsedState = findUsState(stateValue);
    if (!parsedState || parsedState.code !== requestedState) return null;
  }
  const status = (firstString(record, ["status"]) ?? "available").toLowerCase();
  if (UNAVAILABLE.has(status)) return null;

  const host = firstString(record, ["host", "ip", "hostname", "server", "address"]);
  const port = firstNumber(record, ["port", "socks_port", "socksPort"]);
  const username = firstString(record, ["username", "user", "login"]);
  const password = firstString(record, ["password", "pass"]);
  if (!host || !port || !username || !password) return null;

  const externalId =
    firstString(record, ["id", "external_id", "externalId"]) ?? `${host}:${port}:${username}`;

  return {
    externalId,
    host,
    port,
    username,
    password,
    protocol: (firstString(record, ["protocol"]) ?? "socks5").toLowerCase(),
    proxyType: (firstString(record, ["proxy_type", "proxyType", "type"]) ?? "residential").toLowerCase(),
    country: "US",
    stateCode: requestedState,
    city: firstString(record, ["city"]) ?? null,
    status,
    priceCents: firstNumber(record, ["price_cents", "priceCents"]) ?? null,
  };
}

function firstString(record: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return undefined;
}

function firstNumber(record: Record<string, unknown>, keys: string[]): number | null {
  for (const key of keys) {
    const value = record[key];
    const number = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
    if (Number.isInteger(number) && number > 0) return number;
  }
  return null;
}

export async function fetchSshoceanProxiesByState(
  stateInput: string,
  options: {
    env?: Record<string, string | undefined>;
    fetchImpl?: typeof fetch;
  } = {},
): Promise<SshoceanInventory> {
  const stateCode = requireUsStateCode(stateInput);
  const config = sshoceanConfigFromEnv(options.env);
  if (config.mode === "fixture") {
    return { mode: "fixture", stateCode, proxies: fixtureProxiesForState(stateCode) };
  }

  const fetchImpl = options.fetchImpl ?? fetch;
  const url = new URL(`${config.baseUrl}/v1/proxies`);
  url.searchParams.set("country", "US");
  url.searchParams.set("state", stateCode);

  const headers: Record<string, string> = {
    Accept: "application/json",
    Authorization: `Bearer ${config.apiKey}`,
  };
  if (config.apiSecret) headers["X-Api-Secret"] = config.apiSecret;

  let response: Response;
  try {
    response = await fetchImpl(url, {
      method: "GET",
      headers,
      signal: AbortSignal.timeout(20_000),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "network error";
    throw new SshoceanError(`SSHOcean inventory request failed: ${message}`, "http");
  }

  if (!response.ok) {
    throw new SshoceanError(`SSHOcean inventory request failed (HTTP ${response.status}).`, "http");
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new SshoceanError("SSHOcean returned a response that is not JSON.", "parse");
  }

  return {
    mode: "live",
    stateCode,
    proxies: parseSshoceanInventory(payload, stateCode),
  };
}
