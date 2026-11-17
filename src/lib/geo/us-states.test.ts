import { expect, test } from "bun:test";
import { US_STATES, findUsState, requireUsStateCode, timezoneForState } from "./us-states";

test("covers every US state and the District of Columbia", () => {
  expect(US_STATES).toHaveLength(51);
  expect(new Set(US_STATES.map((state) => state.code)).size).toBe(51);
  for (const state of US_STATES) {
    expect(state.code).toMatch(/^[A-Z]{2}$/);
    expect(state.timeZone).toMatch(/^(America|Pacific)\//);
    expect(state.windowsTimeZone.length).toBeGreaterThan(0);
  }
});

test("maps the states called out in the product", () => {
  expect(timezoneForState("NY").timeZone).toBe("America/New_York");
  expect(timezoneForState("New York").windowsTimeZone).toBe("Eastern Standard Time");
  expect(timezoneForState("tx").timeZone).toBe("America/Chicago");
  expect(timezoneForState("Texas").timeZone).toBe("America/Chicago");
  expect(timezoneForState("CA").timeZone).toBe("America/Los_Angeles");
  expect(timezoneForState("AZ").timeZone).toBe("America/Phoenix");
  expect(timezoneForState("CO").timeZone).toBe("America/Denver");
  expect(timezoneForState("AK").timeZone).toBe("America/Anchorage");
  expect(timezoneForState("HI").timeZone).toBe("Pacific/Honolulu");
});

test("rejects a value that is not a state", () => {
  expect(findUsState("ZZ")).toBeUndefined();
  expect(findUsState("")).toBeUndefined();
  expect(() => requireUsStateCode("Ontario")).toThrow(/US state/);
});
