import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { findUsState } from "@/lib/geo/us-states";
import {
  applyBrowserTimezoneFit,
  formatInTimeZone,
  readBrowserTimezoneFit,
} from "@/lib/timezone/fit-device-timezone";

type Props = {
  stateCode?: string;
};

export function TimezoneFitCard({ stateCode }: Props) {
  const state = findUsState(stateCode);
  const [now, setNow] = useState(() => new Date());
  const [savedZone, setSavedZone] = useState<string | null>(null);

  useEffect(() => {
    setSavedZone(readBrowserTimezoneFit()?.timeZone ?? null);
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const fit = () => {
    if (!state) return;
    const result = applyBrowserTimezoneFit(state.code);
    setSavedZone(result.timeZone);
    toast(result.osChanged ? "System timezone updated" : "App timezone saved", {
      description: result.detail,
    });
  };

  return (
    <Card className="border-border/70">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Clock className="h-4 w-4 text-primary" />
          Device timezone
        </CardTitle>
        <CardDescription>
          The installed client lines the device up with the state on the proxy you pick.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {state ? (
          <>
            <p>
              <span className="font-medium text-foreground">{state.name}</span>
              {" uses "}
              <span className="font-mono text-foreground">{state.timeZone}</span>
              {" ("}
              {state.windowsTimeZone}
              {")."}
            </p>
            <p className="text-muted-foreground">
              Clock in that zone: {formatInTimeZone(now, state.timeZone)}
              {savedZone === state.timeZone ? " · saved for this browser" : ""}
            </p>
            {state.zoneNote ? <p className="text-muted-foreground">{state.zoneNote}</p> : null}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Button type="button" size="sm" onClick={fit}>
                Fit this browser to {state.code}
              </Button>
              <code className="rounded bg-muted px-2 py-1 text-xs">
                bun run timezone:fit -- --state {state.code}
              </code>
            </div>
            <p className="text-xs text-muted-foreground">
              The browser can only remember the zone for this app. Windows, macOS, and Linux can change the system
              clock from the installed client with <span className="font-mono">--apply</span>, and that needs an
              administrator. iOS and Android do not allow it. Add <span className="font-mono">--apply</span> only on a
              machine you control.
            </p>
          </>
        ) : (
          <p className="text-muted-foreground">Pick a US state to see the timezone the client will use.</p>
        )}
      </CardContent>
    </Card>
  );
}
