export type SeatStatus = 'available' | 'reserved' | 'sold' | 'held';

export interface Seat {
  id: string;
  x: number;
  y: number;
  priceTier: number;
  status: SeatStatus;
}

export interface Row {
  index: number;
  seats: Seat[];
}

export interface Section {
  id: string;
  label: string;
  rows: Row[];
}

export interface VenueMap {
  width: number;
  height: number;
}

export interface Venue {
  venueId: string;
  name: string;
  map: VenueMap;
  sections: Section[];
}

export const PRICE_TIERS: Record<number, number> = {
  1: 150,
  2: 100,
  3: 75,
  4: 50,
};

export const STATUS_COLORS: Record<SeatStatus, string> = {
  available: '#4ade80',
  reserved: '#facc15',
  sold: '#ef4444',
  held: '#a78bfa',
};

export const STATUS_PATTERNS: Record<SeatStatus, string> = {
  available: '',
  reserved: 'url(#pattern-reserved)',
  sold: 'url(#pattern-sold)',
  held: 'url(#pattern-held)',
};
