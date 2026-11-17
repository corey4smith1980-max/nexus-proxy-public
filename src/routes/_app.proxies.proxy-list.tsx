import { createFileRoute } from "@tanstack/react-router";
import { ProxyList } from "@/pages/ProxyList";

export const Route = createFileRoute("/_app/proxies/proxy-list")({
  component: ProxyList,
});
