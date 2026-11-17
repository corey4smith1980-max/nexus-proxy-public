import { createFileRoute } from "@tanstack/react-router";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Hero } from "@/components/sections/Hero";
import { Features } from "@/components/sections/Features";
import { DashboardPreview } from "@/components/sections/DashboardPreview";
import { Pricing } from "@/components/sections/Pricing";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "NexusProxy — US state proxies from SSHOcean" },
      { name: "description", content: "Pick any US state, order SSHOcean proxies, and fit the device timezone to that state." },
      { property: "og:title", content: "NexusProxy — Buy proxies with BTC, USDT & USDC" },
      { property: "og:description", content: "Crypto-native proxy infrastructure. SOCKS5, rotating ISP, and unlimited residential plans — pay in crypto, deploy instantly." },
      { property: "og:image", content: "/opengraph.jpg" },
      { name: "twitter:image", content: "/opengraph.jpg" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/30">
      <Navbar />
      <main>
        <Hero />
        <Features />
        <DashboardPreview />
        <Pricing />
      </main>
      <Footer />
    </div>
  );
}
