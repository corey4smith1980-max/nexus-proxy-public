/**
 * Plan and apply a device timezone from the US state on the selected proxy.
 *
 * Browsers cannot change the operating system clock. `applyBrowserTimezoneFit`
 * stores the IANA zone for this app and leaves the OS alone. The installed
 * client in `src/client/fit-timezone.ts` can also try the OS tools.
 */

import { timezoneForState, type UsState } from "../geo/us-states";

export const DEVICE_TIMEZONE_STORAGE_KEY = "nexus.deviceTimezone";

export type TimezoneFitScope = "operating-system" | "process" | "app";

export type TimezoneFitResult = {
  stateCode: string;
  stateName: string;
  timeZone: string;
  windowsTimeZone: string;
  zoneNote: string | null;
  scope: TimezoneFitScope;
  applied: boolean;
  osChanged: boolean;
  detail: string;
};

export type StoredTimezoneFit = {
  stateCode: string;
  stateName: string;
  timeZone: string;
  windowsTimeZone: string;
  savedAt: string;
};

type BrowserStorage = {
  localStorage: {
    getItem: (key: string) => string | null;
    setItem: (key: string, value: string) => void;
  };
  dispatchEvent?: (event: Event) => boolean;
};

export function planTimezoneFit(stateCode: string): UsState {
  return timezoneForState(stateCode);
}

export function toFitPlan(state: UsState): Omit<TimezoneFitResult, "scope" | "applied" | "osChanged" | "detail"> {
  return {
    stateCode: state.code,
    stateName: state.name,
    timeZone: state.timeZone,
    windowsTimeZone: state.windowsTimeZone,
    zoneNote: state.zoneNote ?? null,
  };
}

export function formatInTimeZone(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(date);
}

export function readBrowserTimezoneFit(storage?: Pick<BrowserStorage, "localStorage">): StoredTimezoneFit | null {
  const localStorage = storage?.localStorage ?? (typeof window === "undefined" ? undefined : window.localStorage);
  if (!localStorage) return null;
  const raw = localStorage.getItem(DEVICE_TIMEZONE_STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as StoredTimezoneFit;
    if (!parsed?.timeZone || !parsed?.stateCode) return null;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Align app-local time with the proxy state. Does not change the OS timezone.
 */
export function applyBrowserTimezoneFit(stateCode: string, target?: BrowserStorage): TimezoneFitResult {
  const plan = toFitPlan(planTimezoneFit(stateCode));
  const browser = target ?? (typeof window === "undefined" ? undefined : window);
  if (!browser?.localStorage) {
    return {
      ...plan,
      scope: "app",
      applied: false,
      osChanged: false,
      detail:
        "No browser storage is available. Run the installed client on the device (`bun run timezone:fit -- --state " +
        plan.stateCode +
        "`) to set the process timezone, or add --apply with administrator rights to try the operating system.",
    };
  }

  const stored: StoredTimezoneFit = {
    stateCode: plan.stateCode,
    stateName: plan.stateName,
    timeZone: plan.timeZone,
    windowsTimeZone: plan.windowsTimeZone,
    savedAt: new Date().toISOString(),
  };
  browser.localStorage.setItem(DEVICE_TIMEZONE_STORAGE_KEY, JSON.stringify(stored));
  if (typeof CustomEvent !== "undefined" && browser.dispatchEvent) {
    browser.dispatchEvent(new CustomEvent("nexus-timezone-fit", { detail: stored }));
  }

  return {
    ...plan,
    scope: "app",
    applied: true,
    osChanged: false,
    detail:
      `This app will format times in ${plan.timeZone}. The operating system timezone was not changed. ` +
      "A browser cannot call timedatectl, systemsetup, or tzutil. On an installed client, run " +
      `\`bun run timezone:fit -- --state ${plan.stateCode} --apply\` from an administrator shell if the OS clock should move too.`,
  };
}
