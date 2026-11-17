/**
 * US states (plus DC) and the IANA timezone the installed client should use.
 *
 * States that span two zones use the zone of the larger population. `zoneNote`
 * calls out the exception so the client does not pretend the mapping is exact
 * for every county.
 */

export type UsState = {
  code: string;
  name: string;
  timeZone: string;
  windowsTimeZone: string;
  /** Largest city. Fixture inventory uses this as the sample city label. */
  sampleCity: string;
  zoneNote?: string;
};

const WINDOWS_TIME_ZONES: Record<string, string> = {
  "America/New_York": "Eastern Standard Time",
  "America/Chicago": "Central Standard Time",
  "America/Denver": "Mountain Standard Time",
  "America/Phoenix": "US Mountain Standard Time",
  "America/Los_Angeles": "Pacific Standard Time",
  "America/Anchorage": "Alaskan Standard Time",
  "Pacific/Honolulu": "Hawaiian Standard Time",
};

type StateSeed = Omit<UsState, "windowsTimeZone">;

function seal(seed: StateSeed): UsState {
  const windowsTimeZone = WINDOWS_TIME_ZONES[seed.timeZone];
  if (!windowsTimeZone) {
    throw new Error(`No Windows timezone id for ${seed.timeZone}`);
  }
  return { ...seed, windowsTimeZone };
}

const SEEDS: StateSeed[] = [
  { code: "AL", name: "Alabama", timeZone: "America/Chicago", sampleCity: "Birmingham" },
  {
    code: "AK",
    name: "Alaska",
    timeZone: "America/Anchorage",
    sampleCity: "Anchorage",
    zoneNote: "The Aleutian Islands west of 169.5°W use America/Adak. The client uses America/Anchorage.",
  },
  {
    code: "AZ",
    name: "Arizona",
    timeZone: "America/Phoenix",
    sampleCity: "Phoenix",
    zoneNote: "Arizona does not observe daylight saving time, except the Navajo Nation, which follows America/Denver.",
  },
  { code: "AR", name: "Arkansas", timeZone: "America/Chicago", sampleCity: "Little Rock" },
  { code: "CA", name: "California", timeZone: "America/Los_Angeles", sampleCity: "Los Angeles" },
  { code: "CO", name: "Colorado", timeZone: "America/Denver", sampleCity: "Denver" },
  { code: "CT", name: "Connecticut", timeZone: "America/New_York", sampleCity: "Bridgeport" },
  { code: "DE", name: "Delaware", timeZone: "America/New_York", sampleCity: "Wilmington" },
  { code: "DC", name: "District of Columbia", timeZone: "America/New_York", sampleCity: "Washington" },
  {
    code: "FL",
    name: "Florida",
    timeZone: "America/New_York",
    sampleCity: "Miami",
    zoneNote: "The western Panhandle uses America/Chicago. The rest of Florida, including Miami, uses America/New_York.",
  },
  { code: "GA", name: "Georgia", timeZone: "America/New_York", sampleCity: "Atlanta" },
  { code: "HI", name: "Hawaii", timeZone: "Pacific/Honolulu", sampleCity: "Honolulu" },
  {
    code: "ID",
    name: "Idaho",
    timeZone: "America/Denver",
    sampleCity: "Boise",
    zoneNote: "The northern panhandle uses America/Los_Angeles. Boise and most of Idaho use America/Denver.",
  },
  { code: "IL", name: "Illinois", timeZone: "America/Chicago", sampleCity: "Chicago" },
  {
    code: "IN",
    name: "Indiana",
    timeZone: "America/New_York",
    sampleCity: "Indianapolis",
    zoneNote: "A few northwest and southwest counties use America/Chicago. Most of Indiana uses America/New_York.",
  },
  { code: "IA", name: "Iowa", timeZone: "America/Chicago", sampleCity: "Des Moines" },
  {
    code: "KS",
    name: "Kansas",
    timeZone: "America/Chicago",
    sampleCity: "Wichita",
    zoneNote: "Western Kansas uses America/Denver. The client uses America/Chicago.",
  },
  {
    code: "KY",
    name: "Kentucky",
    timeZone: "America/New_York",
    sampleCity: "Louisville",
    zoneNote: "Western Kentucky uses America/Chicago. Louisville and Lexington use America/New_York.",
  },
  { code: "LA", name: "Louisiana", timeZone: "America/Chicago", sampleCity: "New Orleans" },
  { code: "ME", name: "Maine", timeZone: "America/New_York", sampleCity: "Portland" },
  { code: "MD", name: "Maryland", timeZone: "America/New_York", sampleCity: "Baltimore" },
  { code: "MA", name: "Massachusetts", timeZone: "America/New_York", sampleCity: "Boston" },
  {
    code: "MI",
    name: "Michigan",
    timeZone: "America/New_York",
    sampleCity: "Detroit",
    zoneNote: "Counties in the western Upper Peninsula use America/Chicago. The rest of Michigan uses America/New_York.",
  },
  { code: "MN", name: "Minnesota", timeZone: "America/Chicago", sampleCity: "Minneapolis" },
  { code: "MS", name: "Mississippi", timeZone: "America/Chicago", sampleCity: "Jackson" },
  { code: "MO", name: "Missouri", timeZone: "America/Chicago", sampleCity: "Kansas City" },
  { code: "MT", name: "Montana", timeZone: "America/Denver", sampleCity: "Billings" },
  {
    code: "NE",
    name: "Nebraska",
    timeZone: "America/Chicago",
    sampleCity: "Omaha",
    zoneNote: "The western panhandle uses America/Denver. The client uses America/Chicago.",
  },
  {
    code: "NV",
    name: "Nevada",
    timeZone: "America/Los_Angeles",
    sampleCity: "Las Vegas",
    zoneNote: "West Wendover uses America/Denver. Las Vegas and Reno use America/Los_Angeles.",
  },
  { code: "NH", name: "New Hampshire", timeZone: "America/New_York", sampleCity: "Manchester" },
  { code: "NJ", name: "New Jersey", timeZone: "America/New_York", sampleCity: "Newark" },
  { code: "NM", name: "New Mexico", timeZone: "America/Denver", sampleCity: "Albuquerque" },
  { code: "NY", name: "New York", timeZone: "America/New_York", sampleCity: "New York" },
  { code: "NC", name: "North Carolina", timeZone: "America/New_York", sampleCity: "Charlotte" },
  {
    code: "ND",
    name: "North Dakota",
    timeZone: "America/Chicago",
    sampleCity: "Fargo",
    zoneNote: "The southwest corner uses America/Denver. The client uses America/Chicago.",
  },
  { code: "OH", name: "Ohio", timeZone: "America/New_York", sampleCity: "Columbus" },
  { code: "OK", name: "Oklahoma", timeZone: "America/Chicago", sampleCity: "Oklahoma City" },
  {
    code: "OR",
    name: "Oregon",
    timeZone: "America/Los_Angeles",
    sampleCity: "Portland",
    zoneNote: "Most of Malheur County uses America/Denver. The rest of Oregon uses America/Los_Angeles.",
  },
  { code: "PA", name: "Pennsylvania", timeZone: "America/New_York", sampleCity: "Philadelphia" },
  { code: "RI", name: "Rhode Island", timeZone: "America/New_York", sampleCity: "Providence" },
  { code: "SC", name: "South Carolina", timeZone: "America/New_York", sampleCity: "Charleston" },
  {
    code: "SD",
    name: "South Dakota",
    timeZone: "America/Chicago",
    sampleCity: "Sioux Falls",
    zoneNote: "The western half uses America/Denver. The client uses America/Chicago.",
  },
  {
    code: "TN",
    name: "Tennessee",
    timeZone: "America/Chicago",
    sampleCity: "Nashville",
    zoneNote: "East Tennessee uses America/New_York. Nashville and Memphis use America/Chicago.",
  },
  {
    code: "TX",
    name: "Texas",
    timeZone: "America/Chicago",
    sampleCity: "Houston",
    zoneNote: "El Paso and Hudspeth County use America/Denver. The rest of Texas uses America/Chicago.",
  },
  { code: "UT", name: "Utah", timeZone: "America/Denver", sampleCity: "Salt Lake City" },
  { code: "VT", name: "Vermont", timeZone: "America/New_York", sampleCity: "Burlington" },
  { code: "VA", name: "Virginia", timeZone: "America/New_York", sampleCity: "Virginia Beach" },
  { code: "WA", name: "Washington", timeZone: "America/Los_Angeles", sampleCity: "Seattle" },
  { code: "WV", name: "West Virginia", timeZone: "America/New_York", sampleCity: "Charleston" },
  { code: "WI", name: "Wisconsin", timeZone: "America/Chicago", sampleCity: "Milwaukee" },
  { code: "WY", name: "Wyoming", timeZone: "America/Denver", sampleCity: "Cheyenne" },
];

export const US_STATES: readonly UsState[] = SEEDS.map(seal);

const BY_CODE = new Map(US_STATES.map((state) => [state.code, state]));
const BY_NAME = new Map(US_STATES.map((state) => [state.name.toLowerCase(), state]));

export function findUsState(value: string | null | undefined): UsState | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return BY_CODE.get(trimmed.toUpperCase()) ?? BY_NAME.get(trimmed.toLowerCase());
}

/** Empty input becomes undefined. Unknown values become undefined. */
export function normalizeUsStateCode(value: string | null | undefined): string | undefined {
  return findUsState(value)?.code;
}

export function requireUsStateCode(value: string | null | undefined): string {
  const state = findUsState(value);
  if (!state) {
    throw new Error(`Choose a US state. "${value ?? ""}" is not a state code or name.`);
  }
  return state.code;
}

export function timezoneForState(value: string): UsState {
  const state = findUsState(value);
  if (!state) {
    throw new Error(`No timezone mapping for "${value}".`);
  }
  return state;
}
