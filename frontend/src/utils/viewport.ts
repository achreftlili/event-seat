import { Seat, Section } from '../types/venue';

export function getSeatLabel(
  seat: Seat,
  sections: Section[]
): { section: string; row: number; col: number } {
  for (const section of sections) {
    for (const row of section.rows) {
      const colIdx = row.seats.findIndex((s) => s.id === seat.id);
      if (colIdx !== -1) {
        return { section: section.label, row: row.index, col: colIdx + 1 };
      }
    }
  }
  return { section: 'Unknown', row: 0, col: 0 };
}

export function parseSeatId(id: string): { section: string; row: number; col: number } {
  const parts = id.split('-');
  return {
    section: parts[0] || '',
    row: parseInt(parts[1] || '0', 10),
    col: parseInt(parts[2] || '0', 10),
  };
}
