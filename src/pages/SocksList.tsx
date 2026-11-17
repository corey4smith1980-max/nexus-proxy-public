import { StateProxyBrowser } from "@/components/proxy/StateProxyBrowser";

export function SocksList() {
  return (
    <StateProxyBrowser
      title="Socks List"
      subtitle="SOCKS proxies from SSHOcean. Pick any US state — the list is not locked to one state."
      proxyType="all"
    />
  );
}
