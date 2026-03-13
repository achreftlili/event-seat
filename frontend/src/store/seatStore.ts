import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Seat, SeatStatus, Venue, PRICE_TIERS } from '../types/venue';

const MAX_SELECTION = 8;
const PERSIST_VERSION = 2;

interface ViewportInfo {
  x: number;
  y: number;
  viewW: number;
  viewH: number;
}

interface SeatState {
  status: SeatStatus;
  reservedBy: string | null;
}

interface SeatStore {
  venue: Venue | null;
  userEmail: string | null;
  selectedSeatIds: Set<string>;
  hoveredSeatId: string | null;
  toastMessage: string | null;
  viewportInfo: ViewportInfo;
  seatStates: Map<string, SeatState>;

  setVenue: (venue: Venue) => void;
  setUserEmail: (email: string | null) => void;
  toggleSeat: (seat: Seat) => void;
  clearSelection: () => void;
  setHoveredSeat: (id: string | null) => void;
  showToast: (message: string) => void;
  clearToast: () => void;
  setViewportInfo: (info: ViewportInfo) => void;

  // WebSocket-driven actions
  updateSeatStatus: (seatId: string, status: SeatStatus, reservedBy: string | null) => void;
  initSeatStates: (seats: Record<string, { status: SeatStatus; reservedBy: string | null }>, email: string) => void;

  // Derived
  getSeatStatus: (seatId: string, originalStatus: SeatStatus) => SeatStatus;
  isMyReservation: (seatId: string) => boolean;
  getSelectedSeats: () => Seat[];
  getSubtotal: () => number;
}

export const useSeatStore = create<SeatStore>()(
  persist(
    (set, get) => ({
      venue: null,
      userEmail: null,
      selectedSeatIds: new Set<string>(),
      hoveredSeatId: null,
      toastMessage: null,
      viewportInfo: { x: 0, y: 0, viewW: 0, viewH: 0 },
      seatStates: new Map<string, SeatState>(),

      setVenue: (venue) => set({ venue }),
      setUserEmail: (email) => set({ userEmail: email }),
      setViewportInfo: (info) => set({ viewportInfo: info }),

      toggleSeat: (seat) => {
        const { selectedSeatIds } = get();
        const next = new Set(selectedSeatIds);

        if (next.has(seat.id)) {
          next.delete(seat.id);
        } else {
          if (seat.status !== 'available') return;
          if (next.size >= MAX_SELECTION) {
            get().showToast(`Maximum ${MAX_SELECTION} seats can be selected`);
            return;
          }
          next.add(seat.id);
        }

        set({ selectedSeatIds: next });
      },

      clearSelection: () => set({ selectedSeatIds: new Set() }),

      setHoveredSeat: (id) => set({ hoveredSeatId: id }),

      showToast: (message) => {
        set({ toastMessage: message });
        setTimeout(() => get().clearToast(), 3000);
      },

      clearToast: () => set({ toastMessage: null }),

      updateSeatStatus: (seatId, status, reservedBy) => {
        const { seatStates, userEmail, selectedSeatIds } = get();
        const next = new Map(seatStates);
        next.set(seatId, { status, reservedBy });

        const selectionNext = new Set(selectedSeatIds);
        if (reservedBy === userEmail && status === 'reserved') {
          selectionNext.add(seatId);
        } else {
          selectionNext.delete(seatId);
        }

        set({ seatStates: next, selectedSeatIds: selectionNext });
      },

      initSeatStates: (seats, email) => {
        const next = new Map<string, SeatState>();
        const mySeats = new Set<string>();

        for (const [seatId, state] of Object.entries(seats)) {
          next.set(seatId, state);
          if (state.reservedBy === email && state.status === 'reserved') {
            mySeats.add(seatId);
          }
        }

        set({ seatStates: next, selectedSeatIds: mySeats, userEmail: email });
      },

      getSeatStatus: (seatId, originalStatus) => {
        const serverState = get().seatStates.get(seatId);
        return serverState ? serverState.status : originalStatus;
      },

      isMyReservation: (seatId) => {
        const { seatStates, userEmail } = get();
        const state = seatStates.get(seatId);
        return state?.reservedBy === userEmail && state?.status === 'reserved';
      },

      getSelectedSeats: () => {
        const { venue, selectedSeatIds } = get();
        if (!venue) return [];
        const seats: Seat[] = [];
        for (const section of venue.sections) {
          for (const row of section.rows) {
            for (const seat of row.seats) {
              if (selectedSeatIds.has(seat.id)) seats.push(seat);
            }
          }
        }
        return seats;
      },

      getSubtotal: () => {
        const seats = get().getSelectedSeats();
        return seats.reduce((sum, s) => sum + (PRICE_TIERS[s.priceTier] || 0), 0);
      },
    }),
    {
      name: 'seat-selection-storage',
      version: PERSIST_VERSION,
      partialize: (state) => ({
        selectedSeatIds: Array.from(state.selectedSeatIds),
        userEmail: state.userEmail,
      }),
      merge: (persisted, current) => {
        const p = persisted as { selectedSeatIds?: string[]; userEmail?: string | null } | undefined;
        return {
          ...current,
          selectedSeatIds: new Set(p?.selectedSeatIds || []),
          userEmail: p?.userEmail || null,
        };
      },
    }
  )
);
