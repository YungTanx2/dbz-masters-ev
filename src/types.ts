// Rarity strings that appear in Dragon Ball Super Card Game MASTERS extendedData.Rarity
// on TCGCSV (category 27). Verified live against BT28–BT31 product data (2026-07-05):
// every priced booster card's TRUE rarity (including SPR/SLR/GDR/SCR variant treatments)
// is already stored correctly in extendedData.Rarity — unlike One Piece/Digimon, DBSCG
// does NOT require product-name-suffix remapping. See tcgcsv.ts for details.
export type Rarity =
  | 'Common'
  | 'Uncommon'
  | 'Rare'
  | 'Super Rare'
  | 'Special Rare'          // "(SPR)" suffix in product name — already correct in extendedData
  | 'Special Leader Rare'   // "(SLR)" — premium alt-art/foil treatment of a Leader card
  | 'Concept Rare'          // newer tier (BT26+ era)
  | 'Secret Rare'           // "(SCR)" suffix — true case-hit tier
  | 'God Rare';             // "(GDR)" suffix — rarest chase tier (~1 per 3-6 cases)

// TCGCSV subType names for DBS Masters cards.
// Each productId is exclusively one OR the other — never both for the same card
// (same pattern as Digimon/One Piece).
export type SubType = 'Normal' | 'Foil';

export interface DbzCard {
  name: string;
  rarity: Rarity;
  image?: string;
}

export interface PriceEntry {
  productId: number;
  name: string;
  rarity?: Rarity;
  subType: SubType;
  marketPrice: number;
  midPrice: number;
  image?: string;
}

export interface RarityStats {
  rarity: string;
  /** Average price for cards of this rarity (subType is homogeneous per rarity after non-booster filtering). */
  avgPrice: number | null;
  /** Number of priced cards counted in the average. */
  foilPriced: number;
  /** Total EV contribution of this rarity bucket to the box EV. */
  evContribution: number;
}

export interface SlotBreakdown {
  /** EV from the Common filler slot. */
  commonEv: number;
  /** EV from the Uncommon filler slot. */
  uncommonEv: number;
  /** EV from the guaranteed Rare slot. */
  rareEv: number;
  /** EV from the hit slot — SR, SPR, SLR, Concept, SCR, GDR. */
  hitEv: number;
}

export interface HitRarityBreakdown {
  /** P(rarity per pack) derived from pull-rates config (1/oneInXPacks). */
  fraction: number;
  /** Average price for this rarity, or null if no priced cards found. */
  avgPrice: number | null;
  /** fraction × avgPrice × packsPerBox — expected $ contribution per box. */
  evPerBox: number;
}

export interface EvResult {
  evPerPack: number;
  evPerBox: number;
  boxCost: number;
  /** How the box price was determined. */
  boxPriceSource: 'box' | 'bundle' | 'manual' | 'unknown';
  profit: number;
  byRarity: Record<string, RarityStats>;
  /** Top hit-slot cards by price (price >= $1). */
  topPulls: PriceEntry[];
  /** Top case-hit-tier cards (Secret Rare, God Rare — very rare pulls). */
  topCaseHitPulls: PriceEntry[];
  slotBreakdown: SlotBreakdown;
  /** Per-rarity EV breakdown for the hit slot, keyed by rarity name. */
  hitBreakdown: Record<string, HitRarityBreakdown>;
  /** True when the EV was calculated with case-hit rarities zeroed out. */
  excludedCaseHits: boolean;
  /** True when pull rates for this set are community estimates (not Bandai-official). */
  isPlaceholder: boolean;
  pricedCardCount: number;
  totalCardCount: number;
}

export interface Sale {
  condition: string;
  variant: string;
  quantity: number;
  purchasePrice: number;
  orderDate: string;
}

export interface ScanCardResult {
  productId: number;
  subType: string;
  name: string;
  rarity: string;
  currentMarketPrice: number;
  recentAvgPrice: number;
  recentSalesCount: number;
  dailyPctChange: number;
  dailyAbsChange: number;
  dailySpiking: boolean;
  weeklyPctChange: number | null;
  weeklyAbsChange: number | null;
  weeklySpiking: boolean;
  price7dAgo: number | null;
  error?: boolean;
}
