import { memo } from 'react';
import { Seat as SeatType, STATUS_COLORS, PRICE_TIERS } from '../types/venue';
import { parseSeatId } from '../utils/viewport';

interface SeatProps {
  seat: SeatType;
  isSelected: boolean;
  isMine: boolean;
  onSelect: (seat: SeatType) => void;
  onHover: (id: string | null) => void;
}

// Icon is 24x24 viewBox, we render at SEAT_SIZE px
const SEAT_SIZE = 18;
const HALF = SEAT_SIZE / 2;

export const SeatComponent = memo(function SeatComponent({
  seat,
  isSelected,
  isMine,
  onSelect,
  onHover,
}: SeatProps) {
  const { section, row, col } = parseSeatId(seat.id);
  const price = PRICE_TIERS[seat.priceTier] || 0;
  const label = `Section ${section}, Row ${row}, Seat ${col}, $${price}, ${seat.status}`;

  const canInteract = seat.status === 'available' || isMine;
  const fill = isMine ? '#3b82f6' : STATUS_COLORS[seat.status];
  const cursor = canInteract ? 'pointer' : 'not-allowed';

  return (
    <g
      id={`seat-${seat.id}`}
      style={{ cursor }}
      role="gridcell"
      tabIndex={0}
      aria-label={label}
      aria-selected={isSelected}
      onClick={() => onSelect(seat)}
      onMouseEnter={() => onHover(seat.id)}
      onMouseLeave={() => onHover(null)}
      onFocus={() => onHover(seat.id)}
      onBlur={() => onHover(null)}
    >
      <use
        href="#seat-icon"
        x={seat.x - HALF}
        y={seat.y - HALF}
        width={SEAT_SIZE}
        height={SEAT_SIZE}
        fill={fill}
      />
      {isMine && (
        <rect
          x={seat.x - HALF - 1}
          y={seat.y - HALF - 1}
          width={SEAT_SIZE + 2}
          height={SEAT_SIZE + 2}
          rx={3}
          fill="none"
          stroke="#1d4ed8"
          strokeWidth={2}
        />
      )}
      {!canInteract && (
        <title>{`${seat.status} — not available for selection`}</title>
      )}
    </g>
  );
});
