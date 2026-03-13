import { describe, it, expect } from 'vitest';
import { parseSeatId, getSeatLabel } from './viewport';
import { Section } from '../types/venue';

describe('parseSeatId', () => {
  it('parses a standard seat ID', () => {
    expect(parseSeatId('A-1-03')).toEqual({ section: 'A', row: 1, col: 3 });
  });

  it('parses a double-digit row and column', () => {
    expect(parseSeatId('B-12-25')).toEqual({ section: 'B', row: 12, col: 25 });
  });

  it('handles edge case with missing parts', () => {
    expect(parseSeatId('X')).toEqual({ section: 'X', row: 0, col: 0 });
  });

  it('handles empty string', () => {
    expect(parseSeatId('')).toEqual({ section: '', row: 0, col: 0 });
  });
});

describe('getSeatLabel', () => {
  const sections: Section[] = [
    {
      id: 'A',
      label: 'Section A',
      rows: [
        {
          index: 1,
          seats: [
            { id: 'A-1-01', x: 0, y: 0, priceTier: 1, status: 'available' },
            { id: 'A-1-02', x: 24, y: 0, priceTier: 1, status: 'sold' },
          ],
        },
        {
          index: 2,
          seats: [
            { id: 'A-2-01', x: 0, y: 24, priceTier: 2, status: 'available' },
          ],
        },
      ],
    },
  ];

  it('finds a seat and returns its label', () => {
    const seat = sections[0].rows[0].seats[1]; // A-1-02
    expect(getSeatLabel(seat, sections)).toEqual({
      section: 'Section A',
      row: 1,
      col: 2,
    });
  });

  it('finds a seat in a different row', () => {
    const seat = sections[0].rows[1].seats[0]; // A-2-01
    expect(getSeatLabel(seat, sections)).toEqual({
      section: 'Section A',
      row: 2,
      col: 1,
    });
  });

  it('returns Unknown for a seat not in any section', () => {
    const ghost = { id: 'Z-99-99', x: 0, y: 0, priceTier: 1, status: 'available' as const };
    expect(getSeatLabel(ghost, sections)).toEqual({
      section: 'Unknown',
      row: 0,
      col: 0,
    });
  });
});
