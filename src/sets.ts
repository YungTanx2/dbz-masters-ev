export interface SetDef {
  id: string;       // slug — matches pull-rates-{id}.json
  name: string;     // display name
  groupId: number;  // TCGCSV group ID
}

/**
 * Dragon Ball Super Card Game MASTERS sets supported by this tool.
 * Scope: BT28 (Prismatic Clash) → BT31 (Impact Beyond Dimensions) — the four
 * currently liquid/traded Masters-era boosters as of 2026-07-05. Older sets
 * (BT21–BT27) and Premium Anniversary boxes (BE24/BE25) are intentionally
 * out of scope — thinner secondary-market pricing makes EV less reliable.
 *
 * `groupId` is the TCGCSV group identifier — browse new sets at:
 *   https://tcgcsv.com/tcgplayer/27/groups  (27 = Dragon Ball Super CCG / "Masters")
 * `id` must match the pull-rates config filename: config/pull-rates-{id}.json
 * All 4 sets currently fall back to config/pull-rates.default.json (no per-set
 * rate overrides yet — see pull-rates.default.json for why).
 */
export const SUPPORTED_SETS: SetDef[] = [
  // Ordered by groupId ascending — TCGCSV registers sets sequentially,
  // so groupId order closely tracks actual product release date.
  { id: 'bt-28', name: 'Prismatic Clash',            groupId: 24402 },
  { id: 'bt-29', name: 'Fearsome Rivals',             groupId: 24565 },
  { id: 'bt-30', name: 'Three Glorious Fighters',     groupId: 24632 },
  { id: 'bt-31', name: 'Impact Beyond Dimensions',    groupId: 24670 },
];

/** The set shown by default when the web app loads — update to the latest active set. */
export const DEFAULT_SET_ID = 'bt-31';
