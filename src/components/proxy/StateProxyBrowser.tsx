import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "wouter";
import { List, RefreshCw, ShoppingCart } from "lucide-react";
import { listSshoceanProxiesByState } from "@/lib/api.functions";
import { findUsState } from "@/lib/geo/us-states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UsStatePicker } from "@/components/proxy/UsStatePicker";
import { TimezoneFitCard } from "@/components/proxy/TimezoneFitCard";

type Props = {
  title: string;
  subtitle?: string;
  proxyType?: string;
  initialState?: string;
};

export function StateProxyBrowser({ title, subtitle, proxyType, initialState }: Props) {
  const [stateCode, setStateCode] = useState(() => {
    const fromProp = findUsState(initialState)?.code;
    if (fromProp) return fromProp;
    if (typeof window === "undefined") return "";
    return findUsState(new URLSearchParams(window.location.search).get("state"))?.code ?? "";
  });
  const fetcher = useServerFn(listSshoceanProxiesByState);
  const state = findUsState(stateCode);

  const query = useQuery({
    queryKey: ["sshocean-inventory", stateCode],
    enabled: Boolean(state),
    queryFn: () => fetcher({ data: { stateCode } }),
  });

  const rows = useMemo(() => {
    const proxies = query.data?.ok ? query.data.proxies ?? [] : [];
    if (!proxyType || proxyType === "all") return proxies;
    return proxies.filter((proxy: { proxyType?: string }) => proxy.proxyType === proxyType);
  }, [query.data, proxyType]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <List className="h-6 w-6 text-primary" />
            {title}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {subtitle ?? "SSHOcean inventory for any US state. Credentials are assigned after the order is provisioned."}
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <UsStatePicker value={stateCode} onChange={setStateCode} />
          <Button
            type="button"
            variant="outline"
            onClick={() => query.refetch()}
            disabled={!state || query.isFetching}
          >
            <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${query.isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      <TimezoneFitCard stateCode={state?.code} />

      <Card>
        <CardHeader className="border-b pb-3">
          <CardTitle className="text-lg">
            {state ? `${state.name} proxies` : "Pick a state"}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {!state ? (
            <div className="px-6 py-16 text-center text-muted-foreground">
              Choose any US state. Inventory is loaded for that state only — nothing is pinned to a single state.
            </div>
          ) : query.isLoading ? (
            <div className="px-6 py-16 text-center text-muted-foreground">Loading SSHOcean inventory for {state.name}…</div>
          ) : query.isError ? (
            <div className="px-6 py-16 text-center">
              <p className="font-medium">Could not load SSHOcean inventory.</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {query.error instanceof Error ? query.error.message : "The inventory request failed."}
              </p>
            </div>
          ) : query.data && query.data.ok === false ? (
            <div className="px-6 py-16 text-center">
              <p className="font-medium">SSHOcean is not ready for {state.name}.</p>
              <p className="mt-1 text-sm text-muted-foreground">{query.data.error}</p>
            </div>
          ) : rows.length === 0 ? (
            <div className="px-6 py-16 text-center text-muted-foreground">
              No {proxyType && proxyType !== "all" ? proxyType : ""} proxies are available in {state.name} right now.
            </div>
          ) : (
            <div className="overflow-x-auto">
              {query.data?.notice ? (
                <p className="border-b bg-muted/40 px-4 py-2 text-xs text-muted-foreground">{query.data.notice}</p>
              ) : (
                <p className="border-b px-4 py-2 text-xs text-muted-foreground">
                  Live SSHOcean stock in {state.name}. Endpoints stay masked until provisioning finishes.
                </p>
              )}
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead>Endpoint</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>State</TableHead>
                    <TableHead>City</TableHead>
                    <TableHead>Timezone</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((proxy: {
                    externalId: string;
                    endpoint: string;
                    proxyType: string;
                    stateCode: string;
                    stateName: string;
                    city: string | null;
                    timeZone: string;
                    priceCents: number | null;
                    status: string;
                  }) => (
                    <TableRow key={proxy.externalId}>
                      <TableCell className="font-mono text-xs">{proxy.endpoint}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="uppercase text-[10px] tracking-wider">
                          {proxy.proxyType}
                        </Badge>
                      </TableCell>
                      <TableCell>{proxy.stateName}</TableCell>
                      <TableCell className="text-muted-foreground">{proxy.city ?? "—"}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{proxy.timeZone}</TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {typeof proxy.priceCents === "number" ? `$${(proxy.priceCents / 100).toFixed(2)}` : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button asChild size="sm" className="h-8 text-xs">
                          <Link href={`/plans?state=${proxy.stateCode}`}>
                            <ShoppingCart className="mr-1 h-3.5 w-3.5" />
                            Order
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
