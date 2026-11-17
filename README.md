# Nexus Proxy

Private proxy app based on the Nexus proxy template. Customers pick any US state, SSHOcean supplies the inventory for that state, and the existing order, assignment, and provisioning worker deliver the proxy. When the client is installed on a device, it tries to line that device's timezone up with the state on the proxy.

## Run locally

```bash
bun install
cp .env.example .env
# For a UI pass without Supabase credentials, set:
#   SSHOCEAN_INVENTORY_MODE=fixture
#   VITE_LOCAL_PREVIEW=true
bun run dev
```

The dev server listens on port **43123**. Open [http://127.0.0.1:43123](http://127.0.0.1:43123).

With `VITE_LOCAL_PREVIEW=true`, the signed-in app routes (including **Proxy List**, **Socks List**, and **Plans**) open without a Supabase session. Leave that flag unset everywhere else.

```bash
bun test
bun run build
```

## Deploy on Render

`render.yaml` defines a Node web service. Render’s Node image does not include Bun, so the Blueprint uses npm and Node. The process listens on `0.0.0.0` and Render’s `$PORT` (`HOST=0.0.0.0` plus Nitro’s `PORT` handling).

- **Runtime:** `node` (not Docker)
- **Build:** `npm ci && VITE_SUPABASE_URL="$SUPABASE_URL" VITE_SUPABASE_PUBLISHABLE_KEY="$SUPABASE_PUBLISHABLE_KEY" VITE_LOCAL_PREVIEW=false npm run build`
- **Start:** `HOST=0.0.0.0 node .output/server/index.mjs`

Set `SSHOCEAN_API_KEY`, `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` in the Render Dashboard. The build copies the two public Supabase values into `VITE_*` so the browser bundle can reach Supabase. Leave `VITE_LOCAL_PREVIEW` false on Render. `SSHOCEAN_API_SECRET` is optional and only needed when the SSHOcean account uses a second secret.

Apply the SQL in `supabase/migrations` to your Supabase project, including `20261117120000_sshocean_state_inventory.sql`, before provisioning against a real database. `supabase/config.toml` ships with `project_id = "your-project-ref"` — point it at your own project. The template `.env` is not part of this repo.

## SSHOcean

Inventory is loaded by US state. The client lives in `src/lib/sshocean/client.ts`.

| Variable | Purpose |
| --- | --- |
| `SSHOCEAN_API_BASE` | API origin. Default `https://api.sshocean.com`. |
| `SSHOCEAN_API_KEY` | Bearer token. Required for live mode. |
| `SSHOCEAN_API_SECRET` | Sent as `X-Api-Secret` when set. |
| `SSHOCEAN_INVENTORY_MODE` | `live` or `fixture`. |

Live request:

```http
GET /v1/proxies?country=US&state=TX
Authorization: Bearer $SSHOCEAN_API_KEY
Accept: application/json
```

`state` is the USPS code (`NY`, `TX`, `CA`, …). The parser accepts `{ proxies: [...] }`, `{ data: [...] }`, `{ results: [...] }`, or a bare array. A row needs a host, port, username, and password. Rows for other states are dropped. Usernames and passwords never go to the browser catalog; the table shows a masked endpoint.

`fixture` mode returns sample rows on the documentation range `192.0.2.0/24` with password `not-a-secret`. It does not call SSHOcean. Use it only on a private machine.

`src/lib/sshocean/sync.ts` upserts that inventory into `proxies` (`country = US`, `region` = state code, `source = sshocean`). Leased rows are not overwritten.

## State picker

The customer UI does not hardcode a state.

- **Proxy List** (`/proxies/proxy-list`) and **Socks List** (`/socks-list`) open a searchable picker of all 50 states plus DC. Choosing a state loads SSHOcean inventory for that state and shows the IANA timezone.
- **Plans** requires a state before checkout. The choice is carried to payment as `?state=TX` and stored on the payment metadata and the order's `state_code`.
- **My Proxies** can fit the browser to the state on an assigned proxy.

## Provisioning

Payment confirmation still runs `runProvisioningWorker`. For an order with `state_code`, the worker:

1. Syncs SSHOcean inventory for that state.
2. Reserves an available, non-blacklisted proxy in that state (`country = US`, `region` = the USPS code).
3. Writes `proxy_assignments`, marks the proxy leased, and logs the attempt with `provider_name = sshocean`.

Orders that have no state keep the previous country / type / auth match.

## Timezone fitting

`src/lib/geo/us-states.ts` maps each state to one IANA zone and the Windows timezone id. Examples:

| State | IANA | Windows |
| --- | --- | --- |
| New York | `America/New_York` | Eastern Standard Time |
| Texas | `America/Chicago` | Central Standard Time |
| Colorado | `America/Denver` | Mountain Standard Time |
| Arizona | `America/Phoenix` | US Mountain Standard Time |
| California | `America/Los_Angeles` | Pacific Standard Time |
| Alaska | `America/Anchorage` | Alaskan Standard Time |
| Hawaii | `Pacific/Honolulu` | Hawaiian Standard Time |

States that span two zones use the zone of the larger population. Texas is `America/Chicago` even though El Paso is `America/Denver`. Arizona is `America/Phoenix` (no daylight saving time) even though the Navajo Nation follows `America/Denver`. The mapping record includes a `zoneNote` where that matters.

On the device:

```bash
bun run timezone:fit -- --state TX
bun run timezone:fit -- --state NY --apply
```

Without `--apply`, the command sets `TZ` for that process only and prints the plan. `--apply` tries the operating system tool:

- Linux: `timedatectl set-timezone <IANA>` — needs systemd and permission to set the timezone. It does not work in most containers.
- macOS: `systemsetup -settimezone <IANA>` — needs an administrator.
- Windows: `tzutil /s "<Windows id>"` — needs an elevated prompt. Windows does not accept IANA names.
- iOS and Android: no third-party API can change the system timezone. The client can only align its own process or the in-app clock.

The browser button **Fit this browser** writes `nexus.deviceTimezone` in local storage and formats app times with that zone. A web page cannot change the operating system clock. If the OS command fails, the process `TZ` is still set and the result says the system clock did not move.
