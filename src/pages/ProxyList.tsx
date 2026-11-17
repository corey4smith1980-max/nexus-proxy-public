import { StateProxyBrowser } from "@/components/proxy/StateProxyBrowser";

interface Props {
  initialType?: string;
  title?: string;
  subtitle?: string;
}

export function ProxyList({
  initialType,
  title = "Proxy List",
  subtitle = "Browse SSHOcean proxies by US state and order the state you want.",
}: Props) {
  return <StateProxyBrowser title={title} subtitle={subtitle} proxyType={initialType} />;
}
