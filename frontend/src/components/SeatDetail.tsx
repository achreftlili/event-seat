import { useSeatStore } from '../store/seatStore';
import { formatPrice, getTierLabel } from '../utils/pricing';
import { parseSeatId } from '../utils/viewport';

export function SeatDetail() {
  const venue = useSeatStore((s) => s.venue);
  const hoveredSeatId = useSeatStore((s) => s.hoveredSeatId);

  if (!venue || !hoveredSeatId) {
    return (
      <div className="bg-white rounded-lg shadow p-4 text-gray-400 text-sm">
        Hover over a seat to see details
      </div>
    );
  }

  let hoveredSeat = null;
  for (const section of venue.sections) {
    for (const row of section.rows) {
      for (const seat of row.seats) {
        if (seat.id === hoveredSeatId) {
          hoveredSeat = seat;
          break;
        }
      }
      if (hoveredSeat) break;
    }
    if (hoveredSeat) break;
  }

  if (!hoveredSeat) return null;

  const { section, row, col } = parseSeatId(hoveredSeat.id);

  return (
    <div className="bg-white rounded-lg shadow p-4 space-y-2">
      <h3 className="font-semibold text-lg">Seat Details</h3>
      <div className="grid grid-cols-2 gap-1 text-sm">
        <span className="text-gray-500">Section:</span>
        <span className="font-medium">{section}</span>
        <span className="text-gray-500">Row:</span>
        <span className="font-medium">{row}</span>
        <span className="text-gray-500">Seat:</span>
        <span className="font-medium">{col}</span>
        <span className="text-gray-500">Tier:</span>
        <span className="font-medium">{getTierLabel(hoveredSeat.priceTier)}</span>
        <span className="text-gray-500">Price:</span>
        <span className="font-medium">{formatPrice(hoveredSeat.priceTier)}</span>
        <span className="text-gray-500">Status:</span>
        <span className={`font-medium capitalize ${
          hoveredSeat.status === 'available' ? 'text-green-600' :
          hoveredSeat.status === 'sold' ? 'text-red-600' :
          hoveredSeat.status === 'reserved' ? 'text-yellow-600' :
          'text-purple-600'
        }`}>
          {hoveredSeat.status}
        </span>
      </div>
    </div>
  );
}
