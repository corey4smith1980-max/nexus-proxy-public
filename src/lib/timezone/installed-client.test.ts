import { expect, test } from "bun:test";
import { applyBrowserTimezoneFit, DEVICE_TIMEZONE_STORAGE_KEY } from "./fit-device-timezone";
import { applyInstalledClientTimezone, operatingSystemTimezoneCommand } from "./installed-client";

test("dry run sets the process timezone and does not run an OS command", async () => {
  let ran = false;
  const env: Record<string, string | undefined> = {};
  const result = await applyInstalledClientTimezone("NY", {
    platform: "linux",
    applyOperatingSystem: false,
    env,
    run: async () => {
      ran = true;
      return { code: 0, stdout: "", stderr: "" };
    },
  });
  expect(ran).toBe(false);
  expect(env.TZ).toBe("America/New_York");
  expect(result.osChanged).toBe(false);
  expect(result.scope).toBe("process");
  expect(result.applied).toBe(true);
});

test("a failed OS command still leaves the process aligned", async () => {
  const env: Record<string, string | undefined> = {};
  const result = await applyInstalledClientTimezone("TX", {
    platform: "linux",
    applyOperatingSystem: true,
    env,
    run: async (command, args) => {
      expect(command).toBe("timedatectl");
      expect(args).toEqual(["set-timezone", "America/Chicago"]);
      return { code: 1, stdout: "", stderr: "Interactive authentication required" };
    },
  });
  expect(result.osChanged).toBe(false);
  expect(result.applied).toBe(true);
  expect(result.timeZone).toBe("America/Chicago");
  expect(env.TZ).toBe("America/Chicago");
  expect(result.detail).toContain("authentication");
});

test("a successful OS command is reported separately from the process timezone", async () => {
  const command = operatingSystemTimezoneCommand("win32", "America/Denver", "Mountain Standard Time");
  expect(command).toEqual({ command: "tzutil", args: ["/s", "Mountain Standard Time"] });
  const result = await applyInstalledClientTimezone("CO", {
    platform: "darwin",
    applyOperatingSystem: true,
    run: async (commandName, args) => {
      expect(commandName).toBe("systemsetup");
      expect(args[1]).toBe("America/Denver");
      return { code: 0, stdout: "", stderr: "" };
    },
  });
  expect(result.osChanged).toBe(true);
  expect(result.scope).toBe("operating-system");
});

test("the browser fit stores the zone and does not claim the OS changed", () => {
  const saved = new Map<string, string>();
  const result = applyBrowserTimezoneFit("HI", {
    localStorage: {
      getItem: (key) => saved.get(key) ?? null,
      setItem: (key, value) => {
        saved.set(key, value);
      },
    },
    dispatchEvent: () => true,
  });
  expect(result.osChanged).toBe(false);
  expect(result.scope).toBe("app");
  expect(result.timeZone).toBe("Pacific/Honolulu");
  expect(saved.get(DEVICE_TIMEZONE_STORAGE_KEY)).toContain("Pacific/Honolulu");
});

test("applying an OS change without a command runner throws", async () => {
  await expect(
    applyInstalledClientTimezone("CA", { platform: "linux", applyOperatingSystem: true }),
  ).rejects.toThrow(/command runner/);
});
