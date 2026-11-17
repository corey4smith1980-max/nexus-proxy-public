/**
 * Timezone fit for the installed Nexus client (Node or Bun), not the browser.
 *
 * The process timezone (`TZ`) is set whenever an env object is provided.
 * Changing the operating system clock is a separate, privileged step and is
 * skipped unless `applyOperatingSystem` is true and a command runner is passed.
 */

import { planTimezoneFit, toFitPlan, type TimezoneFitResult } from "./fit-device-timezone";

export type CommandResult = {
  code: number;
  stdout: string;
  stderr: string;
};

export type CommandRunner = (command: string, args: string[]) => Promise<CommandResult>;

export type InstalledFitOptions = {
  platform: NodeJS.Platform;
  /** When false, only the process TZ is aligned. This is the safe default. */
  applyOperatingSystem: boolean;
  env?: Record<string, string | undefined>;
  run?: CommandRunner;
};

type OsCommand = { command: string; args: string[] };

export function operatingSystemTimezoneCommand(platform: NodeJS.Platform, timeZone: string, windowsTimeZone: string): OsCommand | null {
  switch (platform) {
    case "linux":
      return { command: "timedatectl", args: ["set-timezone", timeZone] };
    case "darwin":
      return { command: "systemsetup", args: ["-settimezone", timeZone] };
    case "win32":
      return { command: "tzutil", args: ["/s", windowsTimeZone] };
    default:
      return null;
  }
}

export async function applyInstalledClientTimezone(stateCode: string, options: InstalledFitOptions): Promise<TimezoneFitResult> {
  const plan = toFitPlan(planTimezoneFit(stateCode));
  if (options.env) {
    options.env.TZ = plan.timeZone;
  }

  if (!options.applyOperatingSystem) {
    return {
      ...plan,
      scope: "process",
      applied: true,
      osChanged: false,
      detail:
        `Process TZ is ${plan.timeZone}. The operating system clock was left unchanged. ` +
        "Re-run with --apply as an administrator to attempt a system change. " +
        osLimitation(options.platform),
    };
  }

  const command = operatingSystemTimezoneCommand(options.platform, plan.timeZone, plan.windowsTimeZone);
  if (!command) {
    return {
      ...plan,
      scope: "process",
      applied: true,
      osChanged: false,
      detail: `No operating-system timezone tool is mapped for platform "${options.platform}". Process TZ is ${plan.timeZone}. ${osLimitation(options.platform)}`,
    };
  }

  if (!options.run) {
    throw new Error("A command runner is required before the client will try to change the operating system timezone.");
  }

  const result = await options.run(command.command, command.args);
  if (result.code === 0) {
    return {
      ...plan,
      scope: "operating-system",
      applied: true,
      osChanged: true,
      detail: `System timezone set with \`${command.command} ${command.args.join(" ")}\`. Process TZ is ${plan.timeZone}.`,
    };
  }

  const reason = (result.stderr || result.stdout || "command failed").trim();
  return {
    ...plan,
    scope: "process",
    applied: true,
    osChanged: false,
    detail:
      `Could not change the operating system timezone (${command.command} exited ${result.code}: ${reason}). ` +
      `Process TZ is ${plan.timeZone}. ${osLimitation(options.platform)}`,
  };
}

function osLimitation(platform: NodeJS.Platform): string {
  switch (platform) {
    case "linux":
      return "timedatectl needs systemd and permission to set the timezone (polkit or root). It does not work in most containers.";
    case "darwin":
      return "systemsetup -settimezone needs an administrator. macOS may also prompt for privileges.";
    case "win32":
      return "tzutil /s needs an elevated command prompt. Windows uses its own timezone ids, not IANA names.";
    default:
      return "iOS and Android do not let third-party apps change the system timezone. The client can only align its own process or UI.";
  }
}
