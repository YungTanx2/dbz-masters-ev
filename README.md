# DBZ Masters EV Calculator

Live booster box expected value calculator + price spike scanner for **Dragon Ball Super Card Game MASTERS** (TCGCSV category 27 — "Dragon Ball Super CCG", the continuation of the original DBSCG / ULTRA-BOUT series). Streams real-time analysis from TCGPlayer prices via [TCGCSV](https://tcgcsv.com).

Not to be confused with **Dragon Ball Super Fusion World** (category 80) or the defunct 2000s Score-era **Dragon Ball Z TCG** (category 23) — those are separate card pools.

Supports **4 sets**: BT28 (Prismatic Clash) through BT31 (Impact Beyond Dimensions) — the currently liquid Masters-era boosters. Older sets and Premium Anniversary boxes are intentionally out of scope.

## Running locally

```bash
npm install
npm run dev          # ts-node — http://localhost:3009
npm run build        # compile to dist/
npm start            # run compiled build
```

Requires Node.js ≥ 22.

## How EV is calculated

### Pack structure

All 4 supported sets are Standard 24-pack boxes, 4 slots per pack:

| Slot | Count | Pool |
|------|:-----:|------|
| Common | 7 | Common (Normal) |
| Uncommon | 3 | Uncommon (Normal) |
| Rare | 1 | Rare (Foil, guaranteed) |
| Hit | varies | Super Rare, Special Rare, Special Leader Rare, Concept Rare, Secret Rare, God Rare |

Confirmed live from each set's sealed "Booster Box" product Description on TCGCSV (12 cards/pack, 24 packs/box). Per-pack filler composition and hit-tier rates are estimates — see disclaimer below.

### Rarity buckets (9 total, no synthetic variants)

`Common` `Uncommon` `Rare` `Super Rare` `Special Rare` `Special Leader Rare` `Concept Rare` `Secret Rare` `God Rare`

**Key difference from One Piece / Digimon:** DBS Masters does NOT require product-name-suffix remapping. TCGCSV's `extendedData.Rarity` already stores the TRUE variant rarity for every product — a card printed with the "(SPR)" treatment already carries `Rarity: "Special Rare"`, "(SLR)" → `"Special Leader Rare"`, "(SCR)" → `"Secret Rare"`, "(GDR)" → `"God Rare"`. This was verified by dumping BT28–BT31 live and cross-checking every suffixed product against its `extendedData.Rarity` (2026-07-05) — no contamination of filler-slot averages was found, unlike the repeated Alt-Art/SP suffix bugs on the sibling Bandai sites. `resolveRarity()` in `src/tcgcsv.ts` keeps a minimal non-booster safety-net regex (currently matches nothing in the 4 supported sets) for future sets that might bundle promos into their main groupId.

Sealed products (Booster Box) and promotional items (Energy Markers) carry `Rarity: "None"` in TCGCSV and are excluded automatically — no separate detection logic needed.

### Price aggregation

EV calculation groups cards by **rarity only** (not subType). After non-booster filtering, rarity buckets are naturally homogeneous in subType: Common/Uncommon have Normal prices, Rare and above have Foil prices.

### Pull rate config

Rates live in three layers that deep-merge at runtime:

| File | Purpose |
|------|---------|
| `config/pull-rates.global.json` | Empty — no truly global rates |
| `config/pull-rates.default.json` | Standard 24×12 baseline + all hit-tier estimates — used by all 4 sets |
| `config/pull-rates-{set-id}.json` | Thin per-set files carrying provenance comments (official type counts); no rate overrides yet |

Rates are stored as `{ "oneInXPacks": N }` integers (human-readable inverse probability). The loader converts to per-pack decimals at runtime.

**All 4 sets are flagged `"_placeholder": true`** — Bandai does not publish official pack odds, only per-set unique-card-type counts. Rates here are community estimates aggregated from ProGamingCrew and BleedingCool pull-rate research. The UI shows a yellow caveat banner; edit rates per-set via the ⚙️ Pull Rates modal (saved to localStorage) or replace the numbers in `config/pull-rates.default.json` once real box-break data is available.

## Price spike scanner

After each EV analysis, a background scan streams through all booster-pullable cards in the set priced ≥ $1 and checks for:

- **Daily spike** — recent NM sales average ≥ 25% above TCGPlayer market price AND ≥ $1 higher
- **Weekly spike** — same threshold compared to 7-day-ago price from the SQLite price history

Price history is maintained by a daily 7z archive ingest from TCGCSV (runs at 21:00 UTC via cron), with a 10-day backfill on first boot. History is pruned to 30 days.

## Deployment (Railway)

```toml
# railway.toml — volume mounted at /data, DB_PATH=/data/price-history.db
```

```
# Procfile
web: node dist/server.js
```

Set environment variable `DB_PATH=/data/price-history.db` on the Railway service. `PORT` is injected automatically.

## Architecture

```
src/
  server.ts             Express — SSE endpoints /api/analyze, /api/scan-set, /api/sets, /api/pull-rates
  sets.ts               Set registry (4 sets, groupIds, default set BT31)
  types.ts              Rarity union (9 buckets, no variants), SubType, SlotBreakdown, EvResult
  tcgcsv.ts             TCGCSV API client — fetchProducts, fetchPrices, resolveRarity (nullable), matchPrices
  calculator.ts         EV calculation — 4-slot model, hitBreakdown
  pull-rates-loader.ts  Three-layer config merge, oneInXPacks → decimal, isPlaceholder flag
  spike-check.ts        TCGPlayer latestsales API — daily/weekly spike detection
  latestsales.ts        TCGPlayer mpapi POST client (browser UA spoofing)
  archive-ingest.ts     TCGCSV 7z archive download + SQLite ingest (category 27)
  price-history-db.ts   SQLite WAL — upsertPrices, queryHistory, pruneOldRows
config/
  pull-rates.global.json
  pull-rates.default.json
  pull-rates-{set-id}.json  (one per set — provenance comments only, no overrides yet)
public/
  index.html            Self-contained webapp (vanilla HTML/CSS/JS, no build step)
```

## Data sources

- **[TCGCSV](https://tcgcsv.com)** — card names, rarities, and live prices (~24hr TCGPlayer cache). Category ID **27** (Dragon Ball Super CCG / MASTERS).
- **TCGPlayer latest-sales API** — NM sales data for spike detection. No API key required (uses browser UA spoofing).

Pull rates are community estimates — Bandai does not publish official pack odds.
