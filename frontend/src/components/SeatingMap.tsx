import { useCallback, useEffect } from 'react';
import { useSeatStore } from '../store/seatStore';
import { useViewport } from '../hooks/useViewport';
import { useKeyboardNav } from '../hooks/useKeyboardNav';
import { SeatComponent } from './Seat';
import { Seat, STATUS_COLORS } from '../types/venue';

interface SeatingMapProps {
  onSeatToggle: (seatId: string) => void;
}

export function SeatingMap({ onSeatToggle }: SeatingMapProps) {
  const venue = useSeatStore((s) => s.venue);
  const selectedSeatIds = useSeatStore((s) => s.selectedSeatIds);
  const setHoveredSeat = useSeatStore((s) => s.setHoveredSeat);
  const setViewportInfo = useSeatStore((s) => s.setViewportInfo);
  const getSeatStatus = useSeatStore((s) => s.getSeatStatus);
  const isMyReservation = useSeatStore((s) => s.isMyReservation);

  const mapWidth = venue?.map.width || 1200;
  const mapHeight = venue?.map.height || 800;

  const {
    containerRef,
    viewport,
    viewBox,
    isInViewport,
    onWheel,
    onPointerDown,
    onPointerMove,
    onPointerUp,
  } = useViewport(mapWidth, mapHeight);

  const { handleKeyDown } = useKeyboardNav(venue?.sections || []);

  const onSeatSelect = useCallback(
    (seat: Seat) => onSeatToggle(seat.id),
    [onSeatToggle]
  );

  const onSeatHover = useCallback(
    (id: string | null) => setHoveredSeat(id),
    [setHoveredSeat]
  );

  // Sync viewport info to store for the external Minimap
  const viewW = viewport.width / viewport.scale;
  const viewH = viewport.height / viewport.scale;
  useEffect(() => {
    setViewportInfo({ x: viewport.x, y: viewport.y, viewW, viewH });
  }, [viewport.x, viewport.y, viewW, viewH, setViewportInfo]);

  if (!venue) return null;

  return (
    <div
      ref={containerRef}
      className="w-full h-full overflow-hidden bg-gray-50 rounded-lg border border-gray-200"
      onWheel={onWheel}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onKeyDown={(e) => handleKeyDown(e, onSeatSelect)}
      style={{ touchAction: 'none' }}
    >
      <svg
        viewBox={viewBox}
        preserveAspectRatio="xMidYMid meet"
        className="w-full h-full"
        role="grid"
        aria-label={`Seating map for ${venue.name}`}
      >
        <defs>
          {/* MdEventSeat icon from react-icons/md (Material Design) */}
          <symbol id="seat-icon" viewBox="0 0 24 24">
            <path d="M4 18v3h3v-3h10v3h3v-6H4zm15-8h3v3h-3zM2 10h3v3H2zm15 3H7V5c0-1.1.9-2 2-2h6c1.1 0 2 .9 2 2v8z" />
          </symbol>
        </defs>

        {venue.sections.map((section) => (
          <g key={section.id} role="row" aria-label={`Section ${section.label}`}>
            <text
              x={section.rows[0]?.seats[0]?.x || 0}
              y={(section.rows[0]?.seats[0]?.y || 0) - 20}
              fontSize="14"
              fontWeight="bold"
              fill="#374151"
            >
              {section.label}
            </text>

            {section.rows.map((row) =>
              row.seats
                .filter((seat) => isInViewport(seat.x, seat.y))
                .map((seat) => {
                  const effectiveStatus = getSeatStatus(seat.id, seat.status);
                  const isMine = isMyReservation(seat.id);
                  const effectiveSeat = { ...seat, status: effectiveStatus };
                  return (
                    <SeatComponent
                      key={seat.id}
                      seat={effectiveSeat}
                      isSelected={selectedSeatIds.has(seat.id)}
                      isMine={isMine}
                      onSelect={onSeatSelect}
                      onHover={onSeatHover}
                    />
                  );
                })
            )}
          </g>
        ))}

        {/* Legend */}
        <g transform={`translate(${mapWidth - 180}, 20)`}>
          <rect x={0} y={0} width={170} height={130} rx={8} fill="white" fillOpacity={0.9} stroke="#e5e7eb" />
          <text x={10} y={22} fontSize="12" fontWeight="bold" fill="#111">Legend</text>
          {Object.entries(STATUS_COLORS).map(([status, color], i) => (
            <g key={status} transform={`translate(10, ${32 + i * 22})`}>
              <use href="#seat-icon" x={0} y={-7} width={14} height={14} fill={color} />
              <text x={20} y={4} fontSize="11" fill="#333" className="capitalize">{status}</text>
            </g>
          ))}
          <g transform={`translate(10, ${32 + 4 * 22})`}>
            <use href="#seat-icon" x={0} y={-7} width={14} height={14} fill="#3b82f6" />
            <text x={20} y={4} fontSize="11" fill="#333">My reservation</text>
          </g>
        </g>
      </svg>
    </div>
  );
}
