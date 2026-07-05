import axios from 'axios';
import { PriceEntry, Rarity } from './types';

// Dragon Ball Super Card Game MASTERS category ID on TCGCSV (tcgcsv.com/tcgplayer/27/...).
// NOTE: category 27 is "Dragon Ball Super CCG" — the continuation of the original DBSCG,
// now branded "Dragon Ball Super Card Game MASTERS" (ULTRA-BOUT / DBS-B## sets).
// This is distinct from category 80 (Dragon Ball Super Fusion World) and category 23
// (the defunct 2000s Score-era Dragon Ball Z TCG) — do not confuse the three.
const CATEGORY_ID = 27;

// All base rarity strings that appear in DBS Masters TCGCSV extendedData.Rarity.
// Verified live against BT28–BT31 product dumps (2026-07-05). Sealed products
// (Booster Box, Energy Markers, etc.) carry Rarity="None" and are excluded by
// simply not appearing in this set.
const VALID_BASE_RARITIES = new Set<string>([
  'Common', 'Uncommon', 'Rare', 'Super Rare', 'Special Rare',
  'Special Leader Rare', 'Concept Rare', 'Secret Rare', 'God Rare',
]);

export interface ExtendedDataEntry {
  name: string;
  displayName: string;
  value: string;
}

export interface TCGProduct {
  productId: number;
  name: string;
  cleanName?: string;
  imageUrl?: string;
  extendedData?: ExtendedDataEntry[];
}

export interface TCGPrice {
  productId: number;
  subTypeName: string;
  lowPrice: number | null;
  midPrice: number | null;
  highPrice: number | null;
  marketPrice: number | null;
}

/** Extract and validate the base rarity string from a product's extendedData. */
function extractBaseRarity(extendedData: ExtendedDataEntry[] = []): string | null {
  const entry = extendedData.find((e) => e.name === 'Rarity');
  if (!entry || !VALID_BASE_RARITIES.has(entry.value)) return null;
  return entry.value;
}

/**
 * Non-booster product safety net. Unlike One Piece/Digimon, no promo/pre-release
 * products were found contaminating BT28–BT31's own groupIds during the live data
 * sweep (2026-07-05) — TCGCSV puts Pre-Release/Judge/Tournament promos in separate
 * `_PR` groupIds, which this app never fetches (see sets.ts scope). This regex is
 * kept as a defensive safety net in case a future set bundles promos into its main
 * groupId; currently it matches nothing in the 4 supported sets.
 */
const NON_BOOSTER_RE = new RegExp([
  '\\(',
  '(?:',
    'Pre-Release',
    '|Judge Pack[^)]*',
    '|Tournament Prize[^)]*',
    '|Championship[^)]*',
    '|World Championship[^)]*',
  ')',
  '\\)\\s*$',
].join(''), 'i');

/**
 * Resolve a DBS Masters card's final Rarity bucket, or null if non-booster.
 *
 * Unlike One Piece/Digimon, DBS Masters does NOT require product-name-suffix
 * remapping: TCGCSV's extendedData.Rarity already reflects the TRUE variant
 * rarity for every product, including "(SPR)" (Special Rare), "(SLR)" (Special
 * Leader Rare), "(SCR)" (Secret Rare), and "(GDR)" (God Rare) treatments —
 * verified by dumping BT28–BT31 live and cross-checking every suffixed product's
 * extendedData.Rarity against its name (2026-07-05). The suffix is purely a
 * cosmetic abbreviation of the (already correct) base rarity.
 *
 * This function still takes `productName` for the NON_BOOSTER_RE safety-net
 * check and to keep the call signature consistent with sibling Bandai sites.
 */
function resolveRarity(baseRarity: string, productName: string): Rarity | null {
  if (NON_BOOSTER_RE.test(productName)) return null;
  return baseRarity as Rarity;
}

const HEADERS = { 'User-Agent': 'dbz-masters-ev/1.0' };

/**
 * Fetch all products (cards + sealed products) for a DBS Masters set from TCGCSV.
 * @param groupId - TCGCSV group ID for the set (see sets.ts for the full list)
 */
export async function fetchProducts(groupId: number): Promise<TCGProduct[]> {
  console.log('  [tcgcsv] Fetching products…');
  const base = `https://tcgcsv.com/tcgplayer/${CATEGORY_ID}/${groupId}`;
  const res = await axios.get<{ results: TCGProduct[] }>(`${base}/products`, { timeout: 15000, headers: HEADERS });
  return res.data.results ?? [];
}

/**
 * Fetch current market prices for all products in a DBS Masters set from TCGCSV.
 * Each product has either Normal or Foil pricing (never both for the same productId).
 * @param groupId - TCGCSV group ID for the set
 */
export async function fetchPrices(groupId: number): Promise<TCGPrice[]> {
  console.log('  [tcgcsv] Fetching prices…');
  const base = `https://tcgcsv.com/tcgplayer/${CATEGORY_ID}/${groupId}`;
  const res = await axios.get<{ results: TCGPrice[] }>(`${base}/prices`, { timeout: 15000, headers: HEADERS });
  return res.data.results ?? [];
}

/**
 * Derives the DBS Masters card list from TCGCSV product data.
 * Products with a valid base Rarity in extendedData are individual cards;
 * sealed products (booster boxes, energy markers) have Rarity="None" and are skipped.
 */
export function extractCards(products: TCGProduct[]): { name: string; rarity: Rarity }[] {
  const cards: { name: string; rarity: Rarity }[] = [];
  for (const product of products) {
    const base = extractBaseRarity(product.extendedData);
    if (!base) continue;
    const rarity = resolveRarity(base, product.name);
    if (rarity === null) continue;
    cards.push({ name: product.name, rarity });
  }
  return cards;
}

/**
 * Builds a pre-keyed price map from the raw prices array.
 * Key format: `${productId}::${subTypeName}`
 */
export function buildPriceMap(prices: TCGPrice[]): Map<string, TCGPrice> {
  const map = new Map<string, TCGPrice>();
  for (const p of prices) {
    map.set(`${p.productId}::${p.subTypeName}`, p);
  }
  return map;
}

/**
 * Builds PriceEntry[] by joining products (which carry rarity via extendedData)
 * with prices by productId.
 *
 * DBS Masters subType handling:
 * - Each productId is exclusively Normal OR Foil — never both.
 * - Non-booster cards (resolveRarity returns null) are skipped.
 * - Entries for BOTH subtypes are emitted so the spike scanner can track all cards.
 * - The calculator aggregates by rarity (not subType) since rarity buckets are
 *   naturally homogeneous in subType after non-booster filtering.
 */
export function matchPrices(products: TCGProduct[], prices: TCGPrice[]): PriceEntry[] {
  const priceMap = buildPriceMap(prices);
  const entries: PriceEntry[] = [];

  for (const product of products) {
    const base = extractBaseRarity(product.extendedData);
    if (!base) continue; // skip sealed products

    const rarity = resolveRarity(base, product.name);
    if (rarity === null) continue; // skip non-booster products

    const image = product.imageUrl ?? undefined;

    const foilPrice   = priceMap.get(`${product.productId}::Foil`);
    const normalPrice = priceMap.get(`${product.productId}::Normal`);

    if (foilPrice) {
      const marketPrice = foilPrice.marketPrice ?? 0;
      const midPrice    = foilPrice.midPrice    ?? 0;
      if (marketPrice > 0 || midPrice > 0) {
        entries.push({ productId: product.productId, name: product.name, rarity, subType: 'Foil', marketPrice, midPrice, image });
      }
    }

    if (normalPrice) {
      const marketPrice = normalPrice.marketPrice ?? 0;
      const midPrice    = normalPrice.midPrice    ?? 0;
      if (marketPrice > 0 || midPrice > 0) {
        entries.push({ productId: product.productId, name: product.name, rarity, subType: 'Normal', marketPrice, midPrice, image });
      }
    }
  }

  return entries;
}

/** Re-export extractBaseRarity for use in server.ts (booster box detection). */
export { extractBaseRarity as extractRarity };
