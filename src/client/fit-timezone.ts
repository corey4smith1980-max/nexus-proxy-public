/**
 * Installed-client entry point.
 *
 *   bun run timezone:fit -- --state TX
 *   bun run timezone:fit -- --state NY --apply
 *
 * Without --apply the command only sets TZ for this process and prints the
 * plan. --apply tries the OS tool and needs administrator rights.
 */

import { execFile } from "node:child_process";
import { applyInstalledClientTimezone, type CommandResult } from "../lib/timezone/installed-client";

function readFlag(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  if (index === -1) return undefined;
  return process.argv[index + 1];
}

function run(command: string, args: string[]): Promise<CommandResult> {
  return new Promise((resolve) => {
    execFile(command, args, { timeout: 15_000 }, (error, stdout, stderr) => {
      if (!error) {
        resolve({ code: 0, stdout: String(stdout ?? ""), stderr: String(stderr ?? "") });
        return;
      }
      const errno = error as NodeJS.ErrnoException & { code?: number | string };
      const code = typeof errno.code === "number" ? errno.code : 127;
      resolve({
        code,
        stdout: String(stdout ?? ""),
        stderr: String(stderr || error.message || ""),
      });
    });
  });
}

const state = readFlag("--state") ?? readFlag("-s");
if (!state) {
  console.error("Usage: bun run timezone:fit -- --state <USPS code or state name> [--apply]");
  process.exit(2);
}

const applyOperatingSystem = process.argv.includes("--apply");
const result = await applyInstalledClientTimezone(state, {
  platform: process.platform,
  applyOperatingSystem,
  env: process.env,
  run,
});

console.log(JSON.stringify(result, null, 2));
process.exit(result.applied ? 0 : 1);
