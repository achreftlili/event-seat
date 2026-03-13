import { useDeferredValue } from 'react';
import { useSeatStore } from '../store/seatStore';
import { formatPrice } from '../utils/pricing';
import { parseSeatId } from '../utils/viewport';

interface SelectionSummaryProps {
  onClearSelection: () => void;
}

export function SelectionSummary({ onClearSelection }: SelectionSummaryProps) {
  const selectedSeats = useSeatStore((s) => s.getSelectedSeats());
  const subtotal = useSeatStore((s) => s.getSubtotal());

  const deferredSubtotal = useDeferredValue(subtotal);
  const deferredSeats = useDeferredValue(selectedSeats);

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-lg">
          Reserved ({deferredSeats.length}/8)
        </h3>
        {deferredSeats.length > 0 && (
          <button
            onClick={onClearSelection}
            className="text-sm text-red-600 hover:text-red-800"
          >
            Release all
          </button>
        )}
      </div>

      {deferredSeats.length === 0 ? (
        <p className="text-gray-400 text-sm">No seats reserved</p>
      ) : (
        <>
          <ul className="space-y-1 mb-3 max-h-48 overflow-y-auto">
            {deferredSeats.map((seat) => {
              const { section, row, col } = parseSeatId(seat.id);
              return (
                <li key={seat.id} className="flex justify-between text-sm">
                  <span>
                    {section}-R{row}-S{col}
                  </span>
                  <span className="font-medium">{formatPrice(seat.priceTier)}</span>
                </li>
              );
            })}
          </ul>
          <div className="border-t pt-2 flex justify-between font-semibold">
            <span>Subtotal</span>
            <span>${deferredSubtotal}</span>
          </div>
        </>
      )}

      <div aria-live="polite" className="sr-only">
        {deferredSeats.length} seats reserved. Subtotal: ${deferredSubtotal}
      </div>
    </div>
  );
}
