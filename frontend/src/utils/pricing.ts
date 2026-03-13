import { PRICE_TIERS } from '../types/venue';

export function formatPrice(priceTier: number): string {
  const price = PRICE_TIERS[priceTier] || 0;
  return `$${price}`;
}

export function getTierLabel(priceTier: number): string {
  switch (priceTier) {
    case 1: return 'Premium';
    case 2: return 'Standard Plus';
    case 3: return 'Standard';
    case 4: return 'Economy';
    default: return 'Unknown';
  }
}
