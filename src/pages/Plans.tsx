// @ts-nocheck
import { useEffect, useState } from "react";
import { Link } from "wouter";
import { useListPlans } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Shield, Server, Zap } from "lucide-react";
import { UsStatePicker } from "@/components/proxy/UsStatePicker";
import { TimezoneFitCard } from "@/components/proxy/TimezoneFitCard";
import { findUsState } from "@/lib/geo/us-states";

export function Plans() {
  const { data: plans, isLoading, isError } = useListPlans();
  const [stateCode, setStateCode] = useState("");

  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get("state");
    const state = findUsState(fromUrl);
    if (state) setStateCode(state.code);
  }, []);

  const state = findUsState(stateCode);

  return (
    <div className="space-y-10">
      <div className="mx-auto max-w-2xl space-y-4 text-center">
        <h1 className="text-4xl font-bold tracking-tight">Choose Your Plan</h1>
        <p className="text-xl text-muted-foreground">
          Pick any US state. SSHOcean fills the order from that state after payment confirms.
        </p>
      </div>

      <div className="mx-auto flex max-w-3xl flex-col items-stretch gap-4 sm:items-center">
        <UsStatePicker value={stateCode} onChange={setStateCode} className="sm:w-[320px]" />
        {!state ? (
          <p className="text-sm text-muted-foreground">Select a state before checkout. Orders are not locked to one state.</p>
        ) : null}
      </div>

      <TimezoneFitCard stateCode={state?.code} />

      {isLoading ? (
        <div className="grid animate-pulse grid-cols-1 gap-8 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="h-96 bg-muted/20" />
          ))}
        </div>
      ) : isError ? (
        <Card>
          <CardHeader>
            <CardTitle>Plans are unavailable</CardTitle>
            <CardDescription>
              The plan catalog needs Supabase. You can still choose a state above. Once the database is connected, checkout uses that state.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
          {plans?.filter((p) => p.isActive).map((plan) => (
            <Card
              key={plan.id}
              className={`relative flex flex-col border-border bg-card/40 backdrop-blur-sm transition-all duration-300 hover:border-primary/50 ${
                plan.planType === "premium" ? "border-primary/30 shadow-[0_0_30px_rgba(0,240,255,0.1)]" : ""
              }`}
            >
              {plan.planType === "premium" && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-primary px-3 py-1 font-bold text-primary-foreground">Most Popular</Badge>
                </div>
              )}

              <CardHeader className="pt-8 text-center">
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <CardDescription className="pt-2">
                  <span className="text-4xl font-bold text-foreground">${(plan.priceUsd / 100).toFixed(2)}</span>
                </CardDescription>
              </CardHeader>

              <CardContent className="flex-1 space-y-6">
                <div className="flex items-center justify-center gap-4 rounded-lg bg-primary/5 py-2 text-sm font-medium text-primary">
                  <div className="flex items-center gap-1"><Server className="h-4 w-4" /> {plan.proxyCount} IPs</div>
                  <div className="flex items-center gap-1"><Zap className="h-4 w-4" /> {plan.bandwidthGb}GB</div>
                  <div className="flex items-center gap-1"><Shield className="h-4 w-4" /> {plan.durationDays}d</div>
                </div>

                <div className="space-y-3">
                  <p className="mb-4 text-sm font-medium uppercase tracking-wider text-muted-foreground">Features</p>
                  {plan.features?.map((feature, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <Check className="h-5 w-5 shrink-0 text-primary" />
                      <span className="text-sm">{feature}</span>
                    </div>
                  ))}
                </div>
              </CardContent>

              <CardFooter className="pt-6">
                {state ? (
                  <Link href={`/payment?planId=${plan.id}&state=${state.code}`} className="w-full">
                    <Button
                      className={`w-full ${
                        plan.planType === "premium"
                          ? "bg-primary text-primary-foreground hover:bg-primary/90"
                          : "bg-secondary text-secondary-foreground hover:bg-secondary/90"
                      }`}
                      size="lg"
                    >
                      Buy in {state.name}
                    </Button>
                  </Link>
                ) : (
                  <Button className="w-full" size="lg" disabled>
                    Choose a state to buy
                  </Button>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
