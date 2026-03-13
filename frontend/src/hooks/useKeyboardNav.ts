import { useCallback, useRef } from 'react';
import { Seat, Section } from '../types/venue';

interface FlatSeat {
  seat: Seat;
  sectionId: string;
  rowIndex: number;
  colIndex: number;
}

export function useKeyboardNav(sections: Section[]) {
  const flatSeats = useRef<FlatSeat[]>([]);
  const focusIndex = useRef(0);

  // Build flat seat grid for navigation
  const buildGrid = useCallback(() => {
    const seats: FlatSeat[] = [];
    for (const section of sections) {
      for (const row of section.rows) {
        row.seats.forEach((seat, colIndex) => {
          seats.push({ seat, sectionId: section.id, rowIndex: row.index, colIndex });
        });
      }
    }
    flatSeats.current = seats;
  }, [sections]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, onSelect: (seat: Seat) => void) => {
      if (flatSeats.current.length === 0) buildGrid();
      const seats = flatSeats.current;
      let idx = focusIndex.current;

      switch (e.key) {
        case 'ArrowRight':
          e.preventDefault();
          idx = Math.min(idx + 1, seats.length - 1);
          break;
        case 'ArrowLeft':
          e.preventDefault();
          idx = Math.max(idx - 1, 0);
          break;
        case 'ArrowDown':
          e.preventDefault();
          idx = Math.min(idx + 10, seats.length - 1);
          break;
        case 'ArrowUp':
          e.preventDefault();
          idx = Math.max(idx - 10, 0);
          break;
        case 'Enter':
        case ' ':
          e.preventDefault();
          if (seats[idx]) onSelect(seats[idx].seat);
          return;
        default:
          return;
      }

      focusIndex.current = idx;
      const seatEl = document.getElementById(`seat-${seats[idx].seat.id}`);
      seatEl?.focus();
    },
    [buildGrid]
  );

  return { handleKeyDown };
}
